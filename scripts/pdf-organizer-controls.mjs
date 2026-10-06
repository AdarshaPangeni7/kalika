export function configureOrganizerControls($, mode) {
  if (mode === 'extract') {
    $('#export-all, #remove-selected, #undo, #reset, #clear').remove();
    $('#select-none').after('<button type="button" id="clear-selection">Clear selection</button>');
    $('#export-selected').removeAttr('hidden');
  } else if (mode === 'rotate' || mode === 'delete') {
    $('#export-selected').remove();
    $('#export-all').removeAttr('hidden');
    if (mode === 'rotate') $('#remove-selected').remove();
    else $('#remove-selected').removeAttr('hidden');
  }
}
