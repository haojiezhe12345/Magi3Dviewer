export function initSelector(el: HTMLSelectElement, items: Record<string, string>, onchangeCallback: (value: string) => any) {
    el.innerHTML = ''

    for (const key in items) {
        const option = document.createElement('option')
        option.innerHTML = key
        option.value = items[key]
        el.appendChild(option)
    }

    el.onchange = e => {
        onchangeCallback((e!.target as HTMLSelectElement).value)
    }
}