# LIN-012: Show Refinement Tasks in tp context View

**Status**: Todo
**Priority**: P2
**Estimate**: 3 points
**Labels**: enhancement, cli, refinement

## Description

Add support for displaying refinement tasks in the `tp context` command output. Currently the context view shows various task states but doesn't specifically highlight tasks that are in refinement or need refinement.

## Acceptance Criteria

- [ ] `tp context` displays a dedicated section for refinement tasks
- [ ] Refinement tasks are identified by label, status, or custom field
- [ ] Clear visual separation between refinement tasks and other task types
- [ ] Include task details: title, ID, assignee, and refinement status
- [ ] Support filtering refinement tasks by team or project
- [ ] Show refinement deadline/timeline if available
- [ ] Integrate with existing context view structure

## Technical Requirements

1. **Identify Refinement Tasks**
   - Check for "refinement" label or similar identifiers
   - Support custom field mapping for refinement status
   - Handle multiple refinement states (needs-refinement, in-refinement, refined)

2. **Update Context Service**
   - Add refinement query to context data gathering
   - Implement refinement task filtering logic
   - Cache refinement task queries appropriately

3. **CLI Display**
   - Add refinement section to context output
   - Use consistent formatting with other sections
   - Support verbose/compact display modes

4. **Configuration**
   - Allow customization of refinement identifiers
   - Support team-specific refinement workflows
   - Store preferences in settings

## Implementation Notes

- Leverage existing IssueService for querying
- Consider creating a RefinementWorkflow if complex logic needed
- Ensure performance with large refinement backlogs
- Follow atomic architecture patterns

## Testing

- Unit tests for refinement identification logic
- Integration tests for context command with refinement tasks
- Test with various refinement configurations
- Performance tests with large datasets

## Dependencies

- Requires existing context command (tp context)
- May need updates to IssueService for refinement queries
- Could benefit from LabelService enhancements

## Related

- Context command implementation
- Issue filtering and search functionality
- Team workflow configurations