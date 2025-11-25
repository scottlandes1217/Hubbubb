Thi# Record Layout Builder Refactoring Plan

## Current State
- **File**: `builder.js`
- **Size**: ~4,857 lines
- **Problem**: Too large, hard to maintain, difficult to add new components

## Proposed Structure

```
app/javascript/record_layouts/
├── builder.js (main orchestrator, ~200-300 lines)
├── modules/
│   ├── editor-setup.js (editor initialization)
│   ├── drag-handler.js (drag & drop logic)
│   ├── component-registry.js (component type registration)
│   ├── save-handler.js (save functionality)
│   ├── sidebar-builder.js (left sidebar)
│   ├── component-locking.js (component locking logic)
│   ├── section-handler.js (section-specific logic)
│   ├── tabs-handler.js (tabs-specific logic)
│   └── utils.js (shared utilities)
└── components/
    ├── field-component.js
    ├── partial-component.js
    ├── section-component.js
    └── tabs-component.js
```

## Benefits

1. **Maintainability**: Each module has a single responsibility
2. **Testability**: Modules can be tested independently
3. **Scalability**: Easy to add new components without touching existing code
4. **Readability**: Smaller files are easier to understand
5. **Collaboration**: Multiple developers can work on different modules

## Migration Strategy

1. **Phase 1**: Create module structure (done)
2. **Phase 2**: Move drag handler logic
3. **Phase 3**: Move component registration
4. **Phase 4**: Move save functionality
5. **Phase 5**: Move component-specific handlers
6. **Phase 6**: Move utilities
7. **Phase 7**: Update main builder.js to use modules
8. **Phase 8**: Test and verify everything works
9. **Phase 9**: Remove old code

## Notes

- File size doesn't matter for runtime performance (JavaScript is bundled/minified)
- File size DOES matter for:
  - Developer experience
  - Code navigation
  - Git diffs
  - Code reviews
  - Onboarding new developers

## Next Steps

1. Start with one module (e.g., `drag-handler.js`)
2. Move related code
3. Test thoroughly
4. Repeat for other modules

