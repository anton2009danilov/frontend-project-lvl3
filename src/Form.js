export default (element) => ({
  init: () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <div class="mb-3">
        <label for="exampleInputEmail1" class="form-label">Ссылка на RSS-канал</label>
        <input type="text" class="form-control" id="exampleInputEmail1" aria-describedby="emailHelp">
      </div>

      <button type="submit" class="btn btn-primary">Добавить RSS-канал</button>
    `;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
    });

    element.append(form);
  },
});
