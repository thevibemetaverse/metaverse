// PortalForm.js - A modular Portal Form component for the metaverse

import { injectPortalFormStyles, createConfettiEffect } from './PortalFormStyles.js';

/**
 * PortalForm class that creates and manages the portal submission form
 */
export class PortalForm {
  /**
   * Create a new portal form instance
   * @param {Object} options Configuration options
   * @param {Function} options.onSubmit Optional callback for form submission
   * @param {Function} options.onClose Optional callback for form close
   */
  constructor(options = {}) {
    this.formContainer = null;
    this.isVisible = false;
    this.options = options;
    this.submitUrl = options.submitUrl || 'https://submit-form.com/OOKKM5IU8';
    
    // Bind methods
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
    this.createForm = this.createForm.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.showSuccessNotification = this.showSuccessNotification.bind(this);
    this.handleInputFocus = this.handleInputFocus.bind(this);
    this.handleInputBlur = this.handleInputBlur.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  /**
   * Show the portal form
   */
  show() {
    if (this.isVisible) return;
    
    // Create form if it doesn't exist
    if (!this.formContainer) {
      this.createForm();
    }
    
    // Ensure the 3D game is properly disabled
    this.disableGameInteractions();
    
    // Add form to document
    document.body.appendChild(this.formContainer);
    this.isVisible = true;
    
    // Set game state to form-open if GameStateManager is available
    if (window.gameStateManager) {
      console.log('[Portal Form] Setting game state to form-open');
      window.gameStateManager.setFormOpen();
    } else {
      // Fallback to an alternative method if needed
      console.log('[Portal Form] GameStateManager not available');
    }
    
    // Add viewport meta tag for mobile responsiveness if not present
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(viewport);
    }
  }

  /**
   * Hide the portal form
   */
  hide() {
    if (!this.isVisible || !this.formContainer) return;
    
    // Set game state back to playing if GameStateManager is available
    if (window.gameStateManager) {
      console.log('[Portal Form] Setting game state back to playing');
      window.gameStateManager.setPlaying();
    }
    
    // Restore game interactions
    this.enableGameInteractions();
    
    // Animate form close
    this.formContainer.style.animation = 'portal-form-disappear 0.5s ease-in forwards';
    
    // Remove from document after animation completes
    setTimeout(() => {
      if (this.formContainer && this.formContainer.parentNode) {
        this.formContainer.remove();
      }
      this.isVisible = false;
      
      // Call onClose callback if provided
      if (this.options.onClose) {
        this.options.onClose();
      }
    }, 500);
  }

  disableGameInteractions() {
    console.log('[PortalForm] Disabling game interactions');
    
    // Find and disable THREE.js canvas
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      // Completely disable the canvas while form is open
      canvas.style.pointerEvents = 'none';
      // Lower the opacity slightly to indicate disabled state
      canvas.style.opacity = '0.8';
      // Store original zIndex to restore later
      canvas._originalZIndex = canvas.style.zIndex || '';
      // Ensure canvas is below form
      canvas.style.zIndex = '1';
    });
    
    // Create a full screen overlay to block all interactions
    // This is a more reliable approach than just disabling pointerEvents
    if (!document.getElementById('form-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'form-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0,0,0,0.1)';
      overlay.style.zIndex = '99999';
      document.body.appendChild(overlay);
    }
    
    // Also block document scroll/touch events
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
  }

  enableGameInteractions() {
    console.log('[PortalForm] Enabling game interactions');
    
    // Restore canvas state
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      // Re-enable pointer events
      canvas.style.pointerEvents = 'auto';
      // Restore original opacity
      canvas.style.opacity = '1';
      // Restore original z-index
      canvas.style.zIndex = canvas._originalZIndex || '';
    });
    
    // Remove the overlay
    const overlay = document.getElementById('form-overlay');
    if (overlay) {
      overlay.remove();
    }
    
    // Restore document scroll
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.height = '';
  }

  /**
   * Create the portal form
   * @private
   * @returns {HTMLElement} The created form container
   */
  createForm() {
    // Inject styles if not already present
    injectPortalFormStyles();
    
    // Create form container
    const formContainer = document.createElement('div');
    formContainer.className = 'portal-form-container';
    formContainer.style.animation = 'portal-form-appear 0.5s ease-out forwards';
    formContainer.style.zIndex = '100000';
    
    // Add mobile touch events
    formContainer.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    formContainer.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    formContainer.addEventListener('click', this.handleClick, { passive: false });
    
    // Create form header
    const heading = document.createElement('h2');
    heading.textContent = 'Submit Portal Application';
    heading.style.textShadow = '0 0 10px #4a90e2, 0 0 20px #4a90e2';
    heading.style.animation = 'portal-glow 2s infinite alternate';
    
    // Create form element
    const form = document.createElement('form');
    form.id = 'portal-form';
    form.action = this.submitUrl;
    
    // URL input
    const urlLabel = document.createElement('label');
    urlLabel.textContent = 'Portal URL:';
    urlLabel.htmlFor = 'url';
    
    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.id = 'url';
    urlInput.name = 'url';
    urlInput.placeholder = 'https://example.com';
    urlInput.required = true;
    urlInput.autocomplete = 'off';
    urlInput.autocapitalize = 'off';
    urlInput.addEventListener('focus', this.handleInputFocus);
    urlInput.addEventListener('blur', this.handleInputBlur);
    urlInput.addEventListener('touchstart', e => {
      e.stopPropagation();
    });
    
    // Image URL input
    const imageLabel = document.createElement('label');
    imageLabel.textContent = 'Portal Image URL:';
    imageLabel.htmlFor = 'image';
    
    const imageInput = document.createElement('input');
    imageInput.type = 'url';
    imageInput.id = 'image';
    imageInput.name = 'image';
    imageInput.placeholder = 'https://example.com/image.jpg';
    imageInput.required = true;
    imageInput.autocomplete = 'off';
    imageInput.autocapitalize = 'off';
    imageInput.addEventListener('focus', this.handleInputFocus);
    imageInput.addEventListener('blur', this.handleInputBlur);
    imageInput.addEventListener('touchstart', e => {
      e.stopPropagation();
    });
    
    // Agreement checkbox
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'checkbox-container';
    
    const agreementCheckbox = document.createElement('input');
    agreementCheckbox.type = 'checkbox';
    agreementCheckbox.id = 'agreement';
    agreementCheckbox.name = 'agreement';
    agreementCheckbox.required = true;
    agreementCheckbox.addEventListener('touchstart', e => {
      e.stopPropagation();
    });
    
    const agreementLabel = document.createElement('label');
    agreementLabel.htmlFor = 'agreement';
    agreementLabel.textContent = 'I agree to add this portal to the metaverse';
    agreementLabel.style.display = 'inline';
    agreementLabel.style.marginLeft = '5px';
    agreementLabel.style.fontWeight = 'normal';
    
    checkboxContainer.appendChild(agreementCheckbox);
    checkboxContainer.appendChild(agreementLabel);
    
    // Buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'buttons';
    
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Submit Portal';
    submitButton.style.padding = '12px 24px';
    submitButton.style.minWidth = '120px';
    submitButton.addEventListener('touchstart', e => {
      e.stopPropagation();
    });
    
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = 'Cancel';
    cancelButton.style.padding = '12px 24px';
    cancelButton.style.minWidth = '120px';
    cancelButton.addEventListener('touchstart', e => {
      e.stopPropagation();
    });
    
    buttonsContainer.appendChild(submitButton);
    buttonsContainer.appendChild(cancelButton);
    
    // Append elements to form
    form.appendChild(urlLabel);
    form.appendChild(urlInput);
    form.appendChild(imageLabel);
    form.appendChild(imageInput);
    form.appendChild(checkboxContainer);
    form.appendChild(buttonsContainer);
    
    // Append elements to container
    formContainer.appendChild(heading);
    formContainer.appendChild(form);
    
    // Cancel button event listener
    cancelButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.hide();
    });
    
    // Form submit handler
    form.addEventListener('submit', this.handleSubmit);
    
    this.formContainer = formContainer;
    return formContainer;
  }
  
  handleTouchStart(e) {
    console.log('[PortalForm] Touch start detected');
    e.stopPropagation();
  }
  
  handleTouchEnd(e) {
    console.log('[PortalForm] Touch end detected');
    e.stopPropagation();
  }
  
  handleClick(e) {
    console.log('[PortalForm] Click detected');
    e.stopPropagation();
  }
  
  handleInputFocus(event) {
    console.log('[PortalForm] Input focused:', event.target.id);
    // Add visual feedback for focused input
    event.target.style.borderColor = '#4a90e2';
    event.target.style.boxShadow = '0 0 5px rgba(74, 144, 226, 0.5)';
    
    // Ensure input is visible when virtual keyboard appears
    setTimeout(() => {
      event.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
  
  handleInputBlur(event) {
    console.log('[PortalForm] Input blurred:', event.target.id);
    // Remove visual feedback
    event.target.style.borderColor = '';
    event.target.style.boxShadow = '';
  }
  
  /**
   * Handle form submission
   * @private
   * @param {Event} e Form submission event
   */
  handleSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('[PortalForm] Form submitted');
    
    // Get form element
    const form = e.target;
    
    // Get form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Submit the form data to FormSpark
    fetch(this.submitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    })
    .then(response => {
      if (response.ok) {
        this.showSuccessNotification();
        
        // Call onSubmit callback if provided
        if (this.options.onSubmit) {
          this.options.onSubmit(data);
        }
        
        this.hide();
      } else {
        throw new Error('Form submission failed');
      }
    })
    .catch(error => {
      console.error('Error submitting form:', error);
      alert('There was an error submitting your form. Please try again.');
    });
  }
  
  /**
   * Show success notification
   * @private
   */
  showSuccessNotification() {
    // Create enhanced success message
    const successMessage = document.createElement('div');
    successMessage.className = 'portal-success-message';
    successMessage.innerHTML = `
      <div class="success-container">
        <div class="success-icon">✓</div>
        <div class="success-text">
          <h3>Portal Submitted Successfully!</h3>
          <p>Your portal request has been received and will be reviewed soon.</p>
        </div>
      </div>
    `;
    document.body.appendChild(successMessage);
    
    // Create confetti effect
    createConfettiEffect();
    
    // Remove success message after 4 seconds
    setTimeout(() => {
      successMessage.style.animation = 'portal-success-disappear 0.5s ease-in forwards';
      
      // Remove element after animation completes
      setTimeout(() => {
        if (successMessage.parentNode) {
          successMessage.remove();
        }
      }, 500);
    }, 4000);
  }
}

// Create and export a singleton instance
export const portalForm = new PortalForm(); 