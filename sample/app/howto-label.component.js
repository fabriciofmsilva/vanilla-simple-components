let howtoLabelCounter = 0;
const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      cursor: default;
    }
  </style>
  <slot></slot>
`;


class HowToLabel extends HTMLElement {
  static get observedAttributes() {
    return ['for'];
  }

  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._slot = this.shadowRoot.querySelector('slot');
    this._slot.addEventListener('slotchange', this._onSlotChange.bind(this));
    this.addEventListener('click', this._onClick);
  }
  connectedCallback() {
    this._updateLabel();
  }

  get for() {
    const value = this.getAttribute('for');
    return value === null ? '' : value;
  }

  set for(value) {
    this.setAttribute('for', value);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    this._updateLabel();
  }
  _updateLabel() {
    Promise.resolve()
      .then(_ => {
        if (!this.id) {
          this.id = `howto-label-generated-${howtoLabelCounter++}`;
        }
        let oldTarget = this._currentLabelTarget();
        let newTarget = this._findTarget();
        if (!newTarget || oldTarget === newTarget) {
          return;
        }
        if (oldTarget) {
          oldTarget.removeAttribute('aria-labelledby');
        }
        newTarget.setAttribute('aria-labelledby', this.id);
      });
  }

  _onSlotChange(event) {
    this._updateLabel();
  }

  _onClick(event) {
    let el = this._currentLabelTarget();
    if (!el || event.target === el) {
      return;
    }
    el.focus();
    el.click();
  }

  _currentLabelTarget() {
    let scope = this.getRootNode();
    return scope.querySelector(`[aria-labelledby="${this.id}"]`);
  }
  _findTarget() {
    if (this.for) {
      let scope = this.getRootNode();
      return scope.getElementById(this.for);
    }
    let slottedChildren =
      this._slot.assignedNodes({flatten: true})
        .filter(child => child.nodeType !== Node.TEXT_NODE);
    let el =
      slottedChildren
        .find(child => child.hasAttribute('howto-label-target'));
    return el || slottedChildren[0];
  }
}
customElements.define('howto-label', HowToLabel);
