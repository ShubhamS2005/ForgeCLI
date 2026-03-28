# ⚡ ForgeCLI — Plugin-Based React Architecture Engine

ForgeCLI is a developer tool that enables **scalable, maintainable React applications** using a **plugin-driven architecture with AST-based code transformation**.

It eliminates manual provider nesting and introduces a **priority-based injection system** to manage application-level concerns like authentication, theming, and more.

---

## 🚨 Problem Statement

As React applications grow, managing multiple providers becomes messy:

```tsx
<AuthProvider>
  <ThemeProvider>
    <Router>
      <StateProvider>
        <App />
      </StateProvider>
    </Router>
  </ThemeProvider>
</AuthProvider>
```

## Problems:

❌ Hard to maintain and scale \
❌ Manual ordering errors \
❌ Duplicate or conflicting providers \
❌ Poor developer experience \
💡 Solution: ForgeCLI \

## ForgeCLI introduces:

🔌 Plugin-based architecture \
⚙️ AST-powered code transformation \
🧠 Priority-driven provider injection \
♻️ Idempotent rebuild system \


## ✨ Key Features
🔹 1. Plugin System

Add features using simple CLI commands:

```bash
forge add auth
forge add theme
```

🔹 2. AST-Based Code Transformation

ForgeCLI uses Babel to:

1. Parse your React app
2. Extract <App />
3. Rebuild provider tree safely

🔹 3. Priority-Based Provider Injection

Each plugin defines a priority:

    ```bash 
        auth → priority 1 \
        theme → priority 10 
    ```

### Result:

    ```bash 
    <AuthProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AuthProvider>
    ```

🔹 4. Clean Rebuild Engine

Instead of patching code, ForgeCLI:

1. Extracts core app 
2. Rebuilds provider tree from scratch 
3. Ensures consistent output 

🔹 5. Idempotent Execution

Running commands multiple times does NOT break your app:

```bash 
forge add auth
forge add auth
```

➡️ No duplicate providers \
➡️ No unnecessary changes 

🔹 6. Automatic Import Injection

ForgeCLI:

Detects existing imports \
Adds missing imports \
Prevents duplication \

## 🏗️ Architecture Overview

Plugins → Config → AST Parser → Provider Extractor
        → Priority Sort → Tree Rebuild → Code Generator

##  Project Structure

```bash
utils/
  astModifier.ts        # AST parsing & transformation 
  rebuildProviders.ts   # Provider rebuild engine 
  logger.ts             # Logging system 
  error-handler.ts      # Error handling 

templates/
  react-app/            # Starter templates

package.json
tsconfig.json
``` 

##  How It Works

1. User runs:
```bash
forge add <plugin>
```
2. Plugin configuration is loaded
3. AST parses React entry file
4. Existing providers are removed
5. Providers are sorted by priority

New tree is generated:
```tsx
<StrictMode>
  <AuthProvider>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </AuthProvider>
</StrictMode>
```

##  Example 
Before
```
<React.StrictMode>
  <App />
</React.StrictMode>
```
After

```
<React.StrictMode>
  <AuthProvider>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </AuthProvider>
</React.StrictMode>
```

## 🧠 Design Decisions
### Rebuild > Patch Approach 
Ensures deterministic and clean output 
### Priority System 
Avoids dependency conflicts 
### AST over Regex 
Guarantees safe transformations 

## 🔮 Future Improvements
🔗 Plugin dependency resolution system \
⚡ Smart diff engine (avoid unnecessary rebuilds) \
🧩 Plugin hooks (modify routes, config, etc.) \
🧪 Automated test suite \
🌐 Support for non-React frameworks \

## 🎯 Why This Matters 
ForgeCLI brings:
📈 Scalable architecture \
🧹 Cleaner codebases \
⚡ Faster development workflows \
🔌 Extensible ecosystem 


## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Open issues
2. Suggest features 
3. Submit PRs 

## 📜 License

MIT License

## 👨‍💻 Author

Shubham Srivastava shubhamsrivastava12568@gmail.com