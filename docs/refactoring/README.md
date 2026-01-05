# Refactoring Plans

This directory contains detailed refactoring plans for AKROBUD codebase improvements.

## Available Plans

### [Import Service Refactoring](./import-service-refactor-plan-2025-12-30.md)

**Status:** Ready for Implementation
**Date:** 2025-12-30
**Complexity:** High
**Estimated Effort:** 17-24 days (3.5-5 weeks)

**Summary:**
Splits the monolithic `ImportService` (1350 lines) into 6 specialized services following Single Responsibility Principle and Clean Architecture.

**Key Improvements:**
- Main service reduced from 1350 to ~250 lines
- Repository separation (3 focused repositories)
- Improved testability (target 90%+ coverage)
- Clear separation of concerns
- Better extensibility for new file types

**Proposed Structure:**
```
services/import/
├── importOrchestrationService.ts    (250 lines) - Main orchestrator
├── csvImportService.ts              (200 lines) - CSV processing
├── pdfImportService.ts              (200 lines) - PDF processing
├── importValidationService.ts       (250 lines) - Validation & conflicts
├── folderImportService.ts           (300 lines) - Folder batch import
├── importConflictService.ts         (200 lines) - Variant resolution
└── types/
    ├── import-types.ts              - Shared interfaces
    └── import-enums.ts              - Enums
```

**Risk Level:** Medium
- 7 implementation phases
- No breaking changes in phases 1-5
- Comprehensive rollback plan
- Feature flag support available

**Related Documents:**
- [Architecture Diagrams](./import-service-architecture-diagram.md)
- [Implementation Checklist](./import-service-refactor-checklist.md)

---

### [Delivery Service Refactoring](./delivery-service-refactor-plan-2025-12-30.md)

**Status:** Ready for Review
**Date:** 2025-12-30
**Complexity:** Medium
**Estimated Effort:** 10 days (6-7 days focused)

**Summary:**
Splits the monolithic `DeliveryService` (682 lines) into 5 specialized services following Single Responsibility Principle.

**Key Improvements:**
- Main service reduced from 682 to ~200 lines
- Zero breaking changes at API level
- Improved testability and maintainability
- Clear separation of concerns

**Proposed Structure:**
```
services/delivery/
├── deliveryService.ts (orchestrator, 200 lines)
├── delivery-order-manager.ts (order logic, 150 lines)
├── delivery-calendar-service.ts (scheduling, 120 lines)
├── delivery-analytics-service.ts (statistics, 180 lines)
└── delivery-validation-service.ts (validation, 100 lines)
```

**Risk Level:** Low-Medium
- Incremental migration with 8 phases
- Rollback plan available
- Feature flag support for gradual deployment

---

## How to Use These Plans

### 1. Review Phase
- Read the complete plan
- Discuss with team
- Identify any concerns or additional requirements
- Approve or request changes

### 2. Implementation Phase
- Create feature branch
- Follow phases sequentially
- Run tests after each phase
- Code review before merging

### 3. Deployment Phase
- Test in development environment
- Monitor for issues
- Use feature flags if available
- Have rollback plan ready

---

## Refactoring Guidelines

### When to Create a Refactoring Plan

Create a formal plan when:
- File exceeds 500 lines
- Class has >3 responsibilities
- Changes affect multiple modules
- Risk of breaking changes exists
- Team coordination needed

### Plan Structure

Each plan should include:
1. **Executive Summary** - Quick overview and metrics
2. **Current State Analysis** - Problems and code smells
3. **Proposed Architecture** - New structure and responsibilities
4. **Implementation Phases** - Step-by-step migration
5. **Risk Assessment** - Potential issues and mitigations
6. **Testing Strategy** - How to validate changes
7. **Migration Guide** - Developer instructions
8. **Rollback Plan** - How to undo if needed

### Best Practices

**DO:**
- ✅ Make incremental changes
- ✅ Keep tests passing between phases
- ✅ Document breaking changes
- ✅ Provide code examples
- ✅ Include before/after comparisons
- ✅ Plan for rollback

**DON'T:**
- ❌ Change behavior during refactoring
- ❌ Skip tests
- ❌ Optimize prematurely
- ❌ Ignore edge cases
- ❌ Refactor without review

---

## Contributing

To add a new refactoring plan:

1. Copy the template (if available) or use existing plans as reference
2. Name file: `[module]-refactor-plan-YYYY-MM-DD.md`
3. Follow the standard structure
4. Include code examples
5. Add risk assessment
6. Update this README

---

## Questions?

Contact the development team or open a discussion in the team chat.
