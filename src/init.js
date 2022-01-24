import Form from './Form.js';

export default () => {
  const element = document.getElementById('point');
  const form = new Form(element);
  form.init();
};
