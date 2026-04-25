# Project Manager

A modern desktop application for managing projects and workspaces efficiently. Built with Go and React, Project Manager provides an intuitive interface for organizing, accessing, and managing your development projects.

## Features

- **Project Management**: Create, organize, and manage multiple projects in a centralized workspace
- **Multiple Project Types**: Support for both local projects and GitHub repositories
- **Workspace Management**: Switch between different workspaces and customize your base directory
- **Git Integration**: Execute Git operations directly from the application
- **Project Templates**: Initialize projects using predefined templates
- **Real-time Updates**: Live hot-reload during development for quick iteration
- **Cross-platform**: Available for Windows, macOS, and other supported platforms

## Tech Stack

### Backend
- **Go 1.23.0**: High-performance backend runtime
- **Wails v2**: Go/JavaScript bridge for building desktop applications

### Frontend
- **React**: Modern UI library
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Next-generation build tool
- **Framer Motion**: Animation library
- **Lucide React**: Icon library
- **React Hot Toast**: Toast notifications

## Getting Started

### Prerequisites

- **Go 1.23.0** or higher
- **Node.js** and **pnpm** (or npm)
- **Wails CLI**: Install with `go install github.com/wailsapp/wails/v2/cmd/wails@latest`

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd project-manager
```

2. Install dependencies:
```bash
pnpm install
```

3. Build Go dependencies:
```bash
go mod download
```

### Development

Run the application in live development mode:

```bash
wails dev
```

This command will:
- Start a Vite development server for frontend hot-reload
- Launch the backend Go application
- Open the application window

Access the frontend in your browser at `http://localhost:34115` if you want to test Go methods via DevTools.

### Building

Build a production-ready executable:

```bash
wails build
```

Output will be generated in the `build/bin/` directory.

## Project Structure

```
project-manager/
├── main.go                 # Application entry point
├── go.mod                  # Go module definition
├── wails.json              # Wails configuration
├── backend/                # Go backend code
│   └── app.go              # Main application logic
├── frontend/               # React frontend code
│   ├── src/                # Source files
│   │   ├── App.tsx         # Main application component
│   │   ├── main.tsx        # React entry point
│   │   └── lib/            # Utility functions
│   ├── wailsjs/            # Generated Wails bindings
│   ├── package.json        # Frontend dependencies
│   └── vite.config.ts      # Vite configuration
└── build/                  # Build output
    └── bin/                # Compiled executables
```

## Configuration

### Project Settings

Edit `wails.json` to configure:
- Application title
- Window dimensions
- Build output filename
- Author information

Example:
```json
{
  "name": "project-manager",
  "outputfilename": "project-manager",
  "frontend:install": "pnpm install",
  "frontend:build": "pnpm run build",
  "frontend:dev:watcher": "pnpm run dev",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  }
}
```

### Application Configuration

The application maintains a configuration file at `.config/config.json` containing:
- **baseDir**: Base directory for project storage
- **lastWorkspace**: Last accessed workspace path

## Available Commands

### Frontend Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

### Backend Commands

```bash
# Run in development mode
wails dev

# Build production executable
wails build

# Clean build artifacts
wails clean
```

## Data Models

### Project
```typescript
{
  id: string;           // Unique identifier
  name: string;         // Project name
  description: string;  // Project description
  type: 'Project' | 'Github';  // Project type
  path: string;         // Local path to project
  template: string;     // Template used for initialization
  createdAt: Date;      // Creation timestamp
}
```

### Config
```typescript
{
  baseDir: string;           // Base directory for projects
  lastWorkspace: string;     // Last accessed workspace
}
```

## API Endpoints

The backend exposes the following methods to the frontend:
- Project CRUD operations
- Workspace management
- Git operations
- Configuration management

All methods are automatically bound and available in the frontend via the generated Wails bindings.

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

**higashitaniyume**
- Email: higashitaniyume@gmail.com

## Support

For issues, questions, or suggestions, please open an issue on the GitHub repository.

## Acknowledgments

- [Wails](https://wails.io/) - Go/JavaScript bridge framework
- [React](https://react.dev/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Vite](https://vitejs.dev/) - Build tool

---

**Happy coding! 🚀**
