function filterTable() {
    const input = document.getElementById('searchPartNumber');
    const filter = input.value.toLowerCase();
    const table = document.getElementById('parttable');
    const rows = table.getElementsByTagName('tr');
    for (let i = 1; i < rows.length; i++) {
        const partNumberCell = rows[i].getElementsByClassName('partnumber')[0];
        if (partNumberCell) {
            const textValue = partNumberCell.textContent || partNumberCell.innerText;
            rows[i].style.display = textValue.toLowerCase().includes(filter) ? '' : 'none';
        }
    }
}