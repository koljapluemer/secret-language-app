# ActionBar

The ActionBar is a fairly complex UI element which should be used for the (main) interaction of all tasks going forward.
It has its own strong design language, using color-primary and color secondary, little white, and thick lines.

It communicates via props and emits.
Since tasks have quite complex demands, there is a lot of custom logic in it.

## Main Elements

### Central Element

This is the most complex element, and we will not avoid putting tons of bespoke code here, allowing input, multiple inputs, textareas, buttons.

It's positioned centrally and poes out the top of the action bar a little

### Central Element Header

Optionally, sometimes, we need a small multi-state-toggle above the central element.
It should be made out of buttons directly next to each other, behaving like radio buttons (only one at a time can be activated).
This can e.g. be used by same tasks to toggle the central element between audio recording and text input.

Allow to pass a `str` or a lucide-icon-name, or both, as the content of each button (this type should be used for almost all button content on the ActionBar).

### Central Element Footer

Sometimes, we also need an element centrally below the central element.

This is always an array of buttons, somewhat small but not tiny.
This can e.g. be used to add a "Done" button below a text input in the central element

### Left Element

An array of small buttons to the left and a bit down.
Per default, it contains icon-only buttons for:
- `skip` (can be hidden with prop `hide-skip-button`)
- `disable` (can be hidden with prop `hide-disable-button`)
- `jump-to` (meaning e.g. opening the vocab edit page of the vocab used for the tasks; can be hidden wih prop `hide-jump-to-button`)

These are fairly universal actions, allthough they still should simply emit events and the tasks themselves have the requirement to handle it, b/c what should actually happen when clicked is quite variied.

It is also possile to to pass additional buttons into the left element.

### Right Element

Like the left element, but optional; the user can pass in buttons, otherwise it simply stays hidden.
The special thing here is that the buttons are actually toggles, acting like checkboxes.
This should be designed in an obvious way fitting with the rest of the ActionBar design.

This may e.g. be used to mark that after the current extract-from-resource task, the resource should be marked finished.

