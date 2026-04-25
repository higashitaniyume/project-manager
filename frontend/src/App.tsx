import { useState, useEffect, useRef } from 'react';
import { 
  Folder, GitBranch, Code, Plus, Settings, Terminal, 
  Trash2, ExternalLink, Search, RefreshCw, X, 
  CheckCircle2, AlertCircle, ChevronRight, HardDrive, Link
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { cn } from './lib/utils';
import * as AppService from '../wailsjs/go/backend/App';
import { EventsOn } from '../wailsjs/runtime';

type Project = {
  id: string;
  name: string;
  description: string;
  type: 'Project' | 'Github';
  path: string;
  template: string;
  createdAt: string;
};

type Config = {
  baseDir: string;
};

type TaskLog = {
  taskId: string;
  log: string;
};

type TaskProgress = {
  taskId: string;
  progress: string;
};

type TaskDone = {
  taskId: string;
  success: boolean;
  error?: string;
};

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
  const [search, setSearch] = useState('');
  
  // Modals / Panels
  const [showNewModal, setShowNewModal] = useState(false);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [activeTask, setActiveTask] = useState<{ id: string; name: string; progress: number } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Form states
  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneName, setCloneName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectTemplate, setNewProjectTemplate] = useState('pnpm create vite ./ --template react-ts');
  const [gitInit, setGitInit] = useState(true);

  useEffect(() => {
    refreshData();
    
    // Wails Events
    const unbindLog = EventsOn('task:log', (data: TaskLog) => {
      setLogs(prev => [...prev.slice(-100), data.log]);
    });

    const unbindProgress = EventsOn('task:progress', (data: TaskProgress) => {
      setActiveTask(prev => prev ? { ...prev, progress: parseInt(data.progress) } : null);
    });

    const unbindDone = EventsOn('task:done', (data: TaskDone) => {
      if (data.success) {
        toast.success(`Task ${data.taskId} completed!`);
        refreshData();
        // Ask to open in VS Code
        const taskId = data.taskId;
        const projectName = taskId.split('-')[1];
        // We'll find the project path after refresh
      } else {
        toast.error(`Task failed: ${data.error}`);
      }
      setTimeout(() => {
        setActiveTask(null);
        setShowLogPanel(false);
      }, 3000);
    });

    return () => {
      unbindLog();
      unbindProgress();
      unbindDone();
    };
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const refreshData = async () => {
    try {
      const p = await AppService.ListProjects();
      setProjects(p as any);
      const c = await AppService.GetConfig();
      setConfig(c);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClone = async () => {
    if (!cloneUrl || !cloneName) return;
    const taskId = `clone-${cloneName}`;
    setLogs([]);
    setActiveTask({ id: taskId, name: cloneName, progress: 0 });
    setShowLogPanel(true);
    setShowNewModal(false);
    try {
      await AppService.CloneProject(cloneUrl, cloneName);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCloneUrl(val);
    if (val && !cloneName) {
      const parts = val.split('/');
      let last = parts[parts.length - 1];
      if (last) {
        last = last.replace('.git', '');
        setCloneName(last);
      }
    }
  };

  const handleCreate = async () => {
    if (!newProjectName) return;
    const taskId = `create-${newProjectName}`;
    setLogs([]);
    setActiveTask({ id: taskId, name: newProjectName, progress: 0 });
    setShowLogPanel(true);
    setShowNewModal(false);
    try {
      await AppService.CreateProject(newProjectName, newProjectDesc, newProjectTemplate, gitInit);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const projectList = filteredProjects.filter(p => p.type === 'Project');
  const githubList = filteredProjects.filter(p => p.type === 'Github');

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-slate-800 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary border border-primary/30">
            <Code size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">DevHub</h1>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          <SidebarItem 
            icon={<Folder size={20} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={<Settings size={20} />} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => setShowNewModal(true)}
            className="w-full py-3 px-4 bg-primary hover:bg-primary/90 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={20} />
            <span>New Project</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-slate-900/50">
        <header className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-slate-800 p-6 flex justify-between items-center">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search projects..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <div className="flex gap-4 items-center">
            <button onClick={refreshData} className="p-2 text-slate-400 hover:text-white transition-colors">
              <RefreshCw size={20} />
            </button>
            {config && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full text-xs text-slate-400 border border-slate-700">
                <HardDrive size={14} />
                <span className="truncate max-w-[200px]">{config.baseDir}</span>
              </div>
            )}
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'dashboard' ? (
            <div className="space-y-12">
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                    <Folder size={20} />
                  </div>
                  <h2 className="text-xl font-bold">Local Projects</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {projectList.length > 0 ? projectList.map(p => (
                    <ProjectCard key={p.id} project={p} onRefresh={refreshData} />
                  )) : (
                    <EmptyState label="No local projects yet" />
                  )}
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                    <GitBranch size={20} />
                  </div>
                  <h2 className="text-xl font-bold">Cloned Repositories</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {githubList.length > 0 ? githubList.map(p => (
                    <ProjectCard key={p.id} project={p} onRefresh={refreshData} />
                  )) : (
                    <EmptyState label="No cloned repositories yet" />
                  )}
                </div>
              </section>
            </div>
          ) : (
            <SettingsPage config={config} onUpdate={refreshData} />
          )}
        </div>
      </main>

      {/* Modal: New Project / Clone */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-card border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex border-b border-slate-800">
                <button className="flex-1 py-4 text-sm font-semibold border-b-2 border-primary">Create New Project</button>
                {/* We can add a toggle if needed, but let's keep it simple */}
              </div>
              
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-300 flex items-center gap-2">
                      <Plus size={16} /> New Project
                    </h3>
                    <input 
                      type="text" placeholder="Project Name" 
                      value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                    <textarea 
                      placeholder="Description" 
                      value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 h-24 focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                    />
                    <input 
                      type="text" placeholder="Template Command" 
                      value={newProjectTemplate} onChange={e => setNewProjectTemplate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={gitInit} onChange={e => setGitInit(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-primary" />
                      <span className="text-sm text-slate-400 group-hover:text-slate-300">Initialize Git</span>
                    </label>
                    <button onClick={handleCreate} className="w-full py-3 bg-primary rounded-xl font-bold hover:bg-primary/90 transition-all">Create</button>
                  </div>

                  <div className="space-y-4 border-l border-slate-800 pl-8">
                    <h3 className="font-bold text-slate-300 flex items-center gap-2">
                      <GitBranch size={16} /> Git Clone
                    </h3>
                    <input 
                      type="text" placeholder="Repository URL" 
                      value={cloneUrl} onChange={handleUrlChange}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                    <input 
                      type="text" placeholder="Folder Name" 
                      value={cloneName} onChange={e => setCloneName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                    <p className="text-xs text-slate-500">Project will be cloned into the `Github/` directory.</p>
                    <button onClick={handleClone} className="w-full py-3 bg-slate-700 rounded-xl font-bold hover:bg-slate-600 transition-all">Clone</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Log Panel */}
      <AnimatePresence>
        {showLogPanel && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed bottom-0 left-0 right-0 z-[60] h-1/2 bg-slate-950 border-t border-slate-800 shadow-2xl flex flex-col"
          >
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Terminal className="text-primary" size={20} />
                <span className="font-mono text-sm font-bold">{activeTask?.name || 'Executing Task...'}</span>
                {activeTask && (
                  <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary" 
                      animate={{ width: `${activeTask.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <button onClick={() => setShowLogPanel(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 p-6 font-mono text-xs overflow-y-auto space-y-1 text-slate-300">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-4">
                  <span className="text-slate-600 select-none">{i+1}</span>
                  <span className="whitespace-pre-wrap">{log}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
        active ? "bg-primary/10 text-primary border border-primary/20" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function ProjectCard({ project, onRefresh }: { project: Project, onRefresh: () => void }) {
  const handleDelete = async () => {
    if (!confirm(`Delete project "${project.name}"?`)) return;
    const deleteFiles = confirm(`Also delete project files at ${project.path}?`);
    try {
      await AppService.DeleteProject(project.id, deleteFiles);
      toast.success("Project deleted");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openCode = async () => {
    try {
      await AppService.OpenInVSCode(project.path);
      toast.success("Opening in VS Code...");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openDir = async () => {
    try {
      await AppService.OpenFolder(project.path);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-card border border-slate-800 rounded-2xl p-6 hover:border-slate-600 transition-all shadow-lg hover:shadow-primary/5"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-3 rounded-xl",
            project.type === 'Github' ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"
          )}>
            {project.type === 'Github' ? <GitBranch size={24} /> : <Folder size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{project.name}</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{new Date(project.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={openCode} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all" title="Open in VS Code">
            <Code size={18} />
          </button>
          <button onClick={openDir} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all" title="Open Folder">
            <ExternalLink size={18} />
          </button>
          <button onClick={handleDelete} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" title="Delete">
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      
      <div className="text-sm text-slate-400 line-clamp-2 mb-6 min-h-[40px]">
        {project.type === 'Github' && project.description && project.description.startsWith('http') ? (
          <a href={project.description} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors group/link">
            <Link size={14} className="group-hover/link:text-primary" />
            <span className="truncate">{project.description}</span>
          </a>
        ) : (
          project.description || "No description provided."
        )}
      </div>

      <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-600">Template</span>
        <span className="text-xs font-mono text-slate-400 truncate max-w-[150px]">{project.template}</span>
      </div>
    </motion.div>
  );
}

function SettingsPage({ config, onUpdate }: { config: Config | null, onUpdate: () => void }) {
  const [newDir, setNewDir] = useState(config?.baseDir || '');

  const handleUpdate = async () => {
    try {
      await AppService.SetBaseDir(newDir);
      toast.success("Workspace updated");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold tracking-tight">Settings</h2>
        <p className="text-slate-400">Configure your global workspace and application preferences.</p>
      </div>

      <div className="bg-card border border-slate-800 rounded-2xl p-8 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <HardDrive size={18} />
            <h3>Workspace Root (BaseDir)</h3>
          </div>
          <p className="text-sm text-slate-500">This directory will contain the `Project/` and `Github/` folders.</p>
          <div className="flex gap-3">
            <input 
              type="text" 
              value={newDir}
              onChange={(e) => setNewDir(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none"
            />
            <button onClick={handleUpdate} className="px-6 bg-primary rounded-lg font-bold hover:bg-primary/90 transition-all">Update</button>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <CheckCircle2 size={18} className="text-green-500" />
            <h3>Environment Status</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <EnvBadge label="Git" status={true} />
            <EnvBadge label="Node.js" status={true} />
            <EnvBadge label="pnpm" status={true} />
            <EnvBadge label="VS Code" status={true} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EnvBadge({ label, status }: { label: string, status: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-800">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      {status ? (
        <span className="flex items-center gap-1 text-[10px] text-green-500 font-bold uppercase tracking-wider">
          <CheckCircle2 size={12} /> Ready
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold uppercase tracking-wider">
          <AlertCircle size={12} /> Missing
        </span>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl text-slate-600">
      <Folder size={48} strokeWidth={1} className="mb-4 opacity-20" />
      <p>{label}</p>
    </div>
  );
}
