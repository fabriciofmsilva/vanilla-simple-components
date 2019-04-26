class Alert extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({
      mode: 'open'
    });
    this.shadowRoot.innerHTML = `
      <style>
        .alert {
          padding: 1rem;
          border: 1px solid #ccc;
        }
      </style>

      <div class="alert">
        <slot></slot>
      </div>
    `;
  }

  connectedCallback() {}

  attributeChangeCallback() {}

  disconnectedCallback() {}

  adoptedCallback() {}
}

customElements.define('cc-alert', Alert);
