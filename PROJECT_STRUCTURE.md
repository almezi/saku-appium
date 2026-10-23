# Simple Money Tracker — Project Structure Documentation

This document provides an overview of the project structure and explains where different types of documentation and code can be found.

## 📁 Directory Structure Overview

### Root Directory (`/`)
| File | Purpose | Type |
|------|---------|------|
| `README.md` | Project overview and setup guide | Essential |
| `PROJECT_STRUCTURE.md` | This file — project structure guide | Essential |
| `test-cases-simple-money-tracker.md` | Comprehensive test cases for automated testing | Essential |
| `test-execution-plan.md` | Test execution workflows and scripts | Essential |
| `test-data-specification.md` | Test data management and generators | Essential |
| `test-results-template.md` | Test reporting format and templates | Essential |
| `test-examples.md` | Implementation examples and best practices | Essential |

### Documentation Directory (`docs/`)
| Directory/File | Purpose | Type |
|----------------|---------|------|
| `docs/README.md` | Documentation index and project overview | Essential |
| `docs/00-source-of-truth/` | Source of truth file analysis | Reference |
| `docs/01-architecture-blueprint.md` | Technical architecture and design patterns | Essential |
| `docs/02-tech-stack-dependencies.md` | Technology stack and dependency specifications | Essential |
| `docs/03-codebase-setup.md` | Development setup and environment configuration | Essential |
| `docs/06-functional-spec.md` | Functional requirements and user stories | Essential |
| `docs/08-design-system.md` | Design tokens, components, and visual specifications | Essential |
| `docs/09-ios-migration-plan.md` | iOS migration plan (pending implementation) | Reference |
| `docs/10-accessibility-id-coverage.md` | Accessibility testing coverage and guidelines | Reference |
| `docs/PRD.md` | Product Requirements Document | Essential |

## 📋 Content Organization

### 1. Core Documentation (`docs/`)
**Purpose**: Technical specifications, requirements, and architectural details

#### Required Documents
- `docs/README.md` - Documentation index and project overview
- `docs/01-architecture-blueprint.md` - System architecture and design patterns
- `docs/02-tech-stack-dependencies.md` - Technology stack and dependencies
- `docs/03-codebase-setup.md` - Development setup and configuration
- `docs/06-functional-spec.md` - Functional requirements and user stories
- `docs/08-design-system.md` - Design system and component specifications
- `docs/PRD.md` - Product Requirements Document

#### Reference Documents
- `docs/09-ios-migration-plan.md` - iOS migration plan
- `docs/10-accessibility-id-coverage.md` - Accessibility testing

### 2. Testing Infrastructure (Root)
**Purpose**: Automated testing for the mobile app using Appium MCP

#### Required Documents
- `README.md` - Project overview
- `test-cases-simple-money-tracker.md` - Complete test suite (140+ test cases)
- `test-execution-plan.md` - Test execution workflows
- `test-data-specification.md` - Test data management
- `test-results-template.md` - Test reporting format
- `test-examples.md` - Implementation examples

### 3. Source Analysis (`docs/00-source-of-truth/`)
**Purpose**: Analysis of missing documentation files

#### Current Status
- `docs/00-source-of-truth/00-source-of-truth-analysis.md` - Analysis of missing source of truth files

## 🔍 Files Organization Logic

### Category Classification

#### **Essential Documents** (Required for project understanding)
- Must be present for basic project comprehension
- Core requirements and specifications
- Architecture and setup information

#### **Reference Documents** (Supplementary information)
- Additional context and details
- Planning and roadmap information
- Edge cases and special considerations

#### **Test Infrastructure** (Automation and quality assurance)
- Automated testing strategy
- Test case management
- Result reporting and analysis

### Directory Structure Philosophy

1. **Separation of Concerns**
   - Technical documentation in `docs/`
   - Testing infrastructure in root
   - Reference materials in subdirectories

2. **Source of Truth**
   - Core specifications and requirements are in `docs/`
   - Test documentation is in root for easy execution
   - Analysis and reference materials are in structured subdirectories

3. **Maintainability**
   - Each document has a clear, single purpose
   - Content is organized by function and usage
   - Reference materials are separate from core documentation

## 📝 File Naming Conventions

### Root Directory Files
| File | Naming Convention | Description |
|------|------------------|-------------|
| `README.md` | Standard README naming | Project overview and setup |
| `test-cases-simple-money-tracker.md` | Descriptive with `-` separator | Comprehensive test suite |
| `test-execution-plan.md` | Descriptive with `-` separator | Execution workflows |
| `test-data-specification.md` | Descriptive with `-` separator | Test data management |
| `test-results-template.md` | Descriptive with `-` separator | Reporting format |
| `test-examples.md` | Descriptive with `-` separator | Implementation examples |

### Documentation Files
| File | Naming Convention | Description |
|------|------------------|-------------|
| `docs/README.md` | Standard README naming | Documentation index |
| `docs/01-architecture-blueprint.md` | Numbered with descriptive name | Architecture blueprint |
| `docs/02-tech-stack-dependencies.md` | Numbered with descriptive name | Technology stack |
| `docs/03-codebase-setup.md` | Numbered with descriptive name | Setup and configuration |
| `docs/06-functional-spec.md` | Numbered with descriptive name | Functional specifications |
| `docs/08-design-system.md` | Numbered with descriptive name | Design system |
| `docs/09-ios-migration-plan.md` | Numbered with descriptive name | iOS migration plan |
| `docs/10-accessibility-id-coverage.md` | Numbered with descriptive name | Accessibility coverage |
| `docs/PRD.md` | Acronym naming | Product Requirements Document |

### Source of Truth Files
| File | Naming Convention | Description |
|------|------------------|-------------|
| `docs/00-source-of-truth/00-source-of-truth-analysis.md` | Numbered with descriptive name | Source of truth analysis |

## 📋 Usage Guidelines

### Accessing Documentation

#### For Developers
1. **Start with `README.md`** - Get project overview and setup
2. **Technical Details** - Refer to `docs/` for architecture and specifications
3. **Testing** - Use root directory for test infrastructure
4. **Advanced Topics** - Check reference documentation in subdirectories

#### For Users
1. **Quick Overview** - Read `README.md`
2. **Understanding the App** - Review `docs/06-functional-spec.md`
3. **Testing the App** - Follow root directory test documentation

### File Dependencies

#### Document Dependencies
- `README.md` references files in both root and `docs/`
- Architecture documentation references technical details from multiple sources
- Test documentation depends on test data and execution specifications

#### Project Flow
```
1. Read README.md for project overview
2. Review docs/01-architecture-blueprint.md for technical foundation
3. Examine docs/06-functional-spec.md for functional requirements
4. Use root test files for automation
5. Consult source analysis if needed
```

## 🔧 Maintenance Guidelines

### Adding New Documentation
1. **Determine Purpose**: Define the document's primary function
2. **Choose Location**: Select appropriate directory based on content type
3. **Follow Naming Convention**: Use consistent naming pattern
4. **Update README**: Reference new document in appropriate index

### Updating Documentation
1. **Maintain Structure**: Preserve existing organization and conventions
2. **Consistent Formatting**: Follow established naming and formatting
3. under navigation.

## 📊 Summary

### Project Structure Benefits

#### **Clear Organization**
- Technical documentation in `docs/` for easy access
- Testing infrastructure in root for execution convenience
- Reference materials in organized subdirectories

#### **Maintainability**
- Single responsibility principle for each file
- Consistent naming conventions
- Clear separation of concerns

#### **Accessibility**
- Easy navigation between different types of content
- Logical grouping of related information
- Clear documentation hierarchy

### File Recommendations

#### **Keep in Root**
- Test-related files (essential for automation)
- Documentation for execution and implementation

#### **Move to `docs/`**
- Technical specifications and requirements
- Architectural and design documentation
- Reference materials and guidelines

## 🎯 Conclusion

The project follows a clear separation of concerns:

1. **Core Documentation** (`docs/`) - Technical specifications, requirements, and architecture
2. **Testing Infrastructure** (Root) - Automated testing strategy and execution
3. **Source Analysis** (`docs/00-source-truth/`) - Documentation analysis and reference

This organization ensures that:
- Technical information is organized and accessible
- Testing infrastructure is readily available for execution
- Documentation is maintained consistently
- Project evolution is supported with clear structure

**Result**: A well-organized, maintainable project structure that supports both development and testing activities.