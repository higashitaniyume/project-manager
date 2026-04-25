package backend

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Project metadata
type Project struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Type        string    `json:"type"` // "Project" or "Github"
	Path        string    `json:"path"`
	Template    string    `json:"template"`
	CreatedAt   time.Time `json:"createdAt"`
}

// Config data
type Config struct {
	BaseDir       string `json:"baseDir"`
	LastWorkspace string `json:"lastWorkspace"`
}

// App struct
type App struct {
	ctx      context.Context
	config   Config
	projects []Project
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// Startup is called when the app starts.
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	a.initApp()
}

func (a *App) initApp() {
	// 1. Get BaseDir
	exePath, _ := os.Executable()
	baseDir := filepath.Dir(exePath)

	// Check if config exists
	configDir := filepath.Join(baseDir, ".config")
	configPath := filepath.Join(configDir, "config.json")

	if _, err := os.Stat(configPath); err == nil {
		data, _ := os.ReadFile(configPath)
		json.Unmarshal(data, &a.config)
	} else {
		a.config.BaseDir = baseDir
	}

	// Restore last workspace if it exists and is valid
	if a.config.LastWorkspace != "" {
		if _, err := os.Stat(a.config.LastWorkspace); err == nil {
			a.config.BaseDir = a.config.LastWorkspace
		}
	}

	// 2. Ensure directories
	a.ensureDirs()

	// 3. Load projects
	a.loadProjects()
}

func (a *App) ensureDirs() {
	dirs := []string{"Project", "Github", ".config"}
	for _, d := range dirs {
		path := filepath.Join(a.config.BaseDir, d)
		if _, err := os.Stat(path); os.IsNotExist(err) {
			os.MkdirAll(path, 0755)
		}
	}
}

func (a *App) loadProjects() {
	projectFile := filepath.Join(a.config.BaseDir, ".config", "projects.json")
	if _, err := os.Stat(projectFile); err == nil {
		data, _ := os.ReadFile(projectFile)
		json.Unmarshal(data, &a.projects)
	} else {
		a.projects = []Project{}
	}
}

func (a *App) saveProjects() {
	projectFile := filepath.Join(a.config.BaseDir, ".config", "projects.json")
	data, _ := json.MarshalIndent(a.projects, "", "  ")
	os.WriteFile(projectFile, data, 0644)
}

func (a *App) saveConfig() {
	configDir := filepath.Join(a.config.BaseDir, ".config")
	os.MkdirAll(configDir, 0755)
	configPath := filepath.Join(configDir, "config.json")
	data, _ := json.MarshalIndent(a.config, "", "  ")
	os.WriteFile(configPath, data, 0644)
}

// --- Bound Methods ---

// GetConfig returns the current configuration
func (a *App) GetConfig() Config {
	return a.config
}

// SetBaseDir updates the workspace root
func (a *App) SetBaseDir(path string) error {
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return fmt.Errorf("directory does not exist")
	}
	a.config.BaseDir = path
	a.config.LastWorkspace = path
	a.saveConfig()
	a.ensureDirs()
	a.loadProjects()
	a.scanWorkspace()
	return nil
}

func (a *App) scanWorkspace() {
	existing := make(map[string]bool)
	for _, p := range a.projects {
		existing[p.Path] = true
	}

	// Scan Github
	githubDir := filepath.Join(a.config.BaseDir, "Github")
	entries, err := os.ReadDir(githubDir)
	if err == nil {
		for _, e := range entries {
			if e.IsDir() {
				pPath := filepath.Join(githubDir, e.Name())
				if !existing[pPath] {
					url := ""
					cmd := exec.Command("git", "config", "--get", "remote.origin.url")
					cmd.Dir = pPath
					out, err := cmd.Output()
					if err == nil {
						url = strings.TrimSpace(string(out))
					}
					a.projects = append(a.projects, Project{
						ID:          fmt.Sprintf("%d", time.Now().UnixNano()),
						Name:        e.Name(),
						Description: url,
						Type:        "Github",
						Path:        pPath,
						Template:    "Scanned Github Repo",
						CreatedAt:   time.Now(),
					})
				}
			}
		}
	}

	// Scan Project
	projectDir := filepath.Join(a.config.BaseDir, "Project")
	entries, err = os.ReadDir(projectDir)
	if err == nil {
		for _, e := range entries {
			if e.IsDir() {
				pPath := filepath.Join(projectDir, e.Name())
				if !existing[pPath] {
					a.projects = append(a.projects, Project{
						ID:          fmt.Sprintf("%d", time.Now().UnixNano()),
						Name:        e.Name(),
						Description: "Scanned Local Project",
						Type:        "Project",
						Path:        pPath,
						Template:    "Unknown",
						CreatedAt:   time.Now(),
					})
				}
			}
		}
	}

	a.saveProjects()
}

// ListProjects returns the list of projects
func (a *App) ListProjects() []Project {
	return a.projects
}

// OpenFolder opens the directory in system explorer
func (a *App) OpenFolder(path string) error {
	return exec.Command("explorer", path).Start()
}

// OpenInVSCode opens the path in VS Code
func (a *App) OpenInVSCode(path string) error {
	return exec.Command("code", path).Start()
}

// OpenLink opens a URL in the system default browser
func (a *App) OpenLink(url string) error {
	var cmd *exec.Cmd
	switch {
	case os.Getenv("WAYLAND_DISPLAY") != "":
		cmd = exec.Command("xdg-open", url)
	default:
		cmd = exec.Command("cmd", "/c", "start", url)
	}
	return cmd.Start()
}

// DeleteProject removes a project record and optionally its files
func (a *App) DeleteProject(id string, deleteFiles bool) error {
	for i, p := range a.projects {
		if p.ID == id {
			if deleteFiles {
				os.RemoveAll(p.Path)
			}
			a.projects = append(a.projects[:i], a.projects[i+1:]...)
			a.saveProjects()
			return nil
		}
	}
	return fmt.Errorf("project not found")
}

// CloneProject clones a git repository
func (a *App) CloneProject(url string, name string) error {
	destPath := filepath.Join(a.config.BaseDir, "Github", name)

	// Create a log event for the frontend
	logTask := "clone-" + name

	cmd := exec.Command("git", "clone", "--progress", url, destPath)
	return a.runTask(cmd, logTask, func() {
		// On Success
		a.projects = append(a.projects, Project{
			ID:          fmt.Sprintf("%d", time.Now().UnixNano()),
			Name:        name,
			Description: url,
			Type:        "Github",
			Path:        destPath,
			Template:    "git clone",
			CreatedAt:   time.Now(),
		})
		a.saveProjects()
	})
}

// CreateProject creates a new project using a template command
func (a *App) CreateProject(name, desc, templateCmd string, gitInit bool) error {
	destPath := filepath.Join(a.config.BaseDir, "Project", name)
	err := os.MkdirAll(destPath, 0755)
	if err != nil {
		return err
	}

	logTask := "create-" + name

	// Split template command
	parts := strings.Fields(templateCmd)
	if len(parts) == 0 {
		return fmt.Errorf("invalid template command")
	}

	// We'll run the command inside the directory
	cmd := exec.Command(parts[0], parts[1:]...)
	cmd.Dir = destPath

	return a.runTask(cmd, logTask, func() {
		// After template command, handle git init if requested
		if gitInit {
			gitCmd := exec.Command("git", "init")
			gitCmd.Dir = destPath
			gitCmd.Run()
		}

		// Save project
		a.projects = append(a.projects, Project{
			ID:          fmt.Sprintf("%d", time.Now().UnixNano()),
			Name:        name,
			Description: desc,
			Type:        "Project",
			Path:        destPath,
			Template:    templateCmd,
			CreatedAt:   time.Now(),
		})
		a.saveProjects()
	})
}

// runTask executes a command and streams its output to the frontend via events
func (a *App) runTask(cmd *exec.Cmd, taskID string, onSuccess func()) error {
	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()

	if err := cmd.Start(); err != nil {
		return err
	}

	// Create logs directory
	logsDir := filepath.Join(a.config.BaseDir, ".config", "logs")
	os.MkdirAll(logsDir, 0755)

	// Create log file
	logFile := filepath.Join(logsDir, taskID+".log")
	f, err := os.Create(logFile)
	if err != nil {
		return err
	}
	defer f.Close()

	progressRegex := regexp.MustCompile(`(\d+)%`)

	scanFunc := func(r io.Reader) {
		scanner := bufio.NewScanner(r)
		// Custom split function to handle \r without \n (used by git clone progress)
		scanner.Split(func(data []byte, atEOF bool) (advance int, token []byte, err error) {
			if atEOF && len(data) == 0 {
				return 0, nil, nil
			}
			if i := strings.IndexAny(string(data), "\r\n"); i >= 0 {
				return i + 1, data[0:i], nil
			}
			if atEOF {
				return len(data), data, nil
			}
			return 0, nil, nil
		})

		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" {
				continue
			}
			
			// Write to log file
			f.WriteString(line + "\n")
			f.Sync()
			
			runtime.EventsEmit(a.ctx, "task:log", map[string]string{
				"taskId": taskID,
				"log":    line,
			})

			matches := progressRegex.FindStringSubmatch(line)
			if len(matches) > 1 {
				runtime.EventsEmit(a.ctx, "task:progress", map[string]interface{}{
					"taskId":   taskID,
					"progress": matches[1],
				})
			}
		}
	}

	go scanFunc(stdout)
	go scanFunc(stderr)

	go func() {
		err := cmd.Wait()
		if err == nil {
			onSuccess()
			runtime.EventsEmit(a.ctx, "task:done", map[string]any{
				"taskId":  taskID,
				"success": true,
			})
		} else {
			runtime.EventsEmit(a.ctx, "task:done", map[string]any{
				"taskId":  taskID,
				"success": false,
				"error":   err.Error(),
			})
		}
	}()

	return nil
}
