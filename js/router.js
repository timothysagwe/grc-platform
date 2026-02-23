/*
  ROUTER.JS — Controls which module is displayed based on the URL hash.

  A URL hash is the #something part of a URL.
  Example: https://yoursite.github.io/grc-platform/#risks
  The hash here is 'risks'.

  When the user clicks a nav link with href="#risks",
  the browser changes the URL hash WITHOUT reloading the page.
  The hashchange event fires, and the router renders the right module.

  This is how Single Page Applications work without a server.
*/

const Router = (() => {

  // routes is an object mapping hash names to render functions.
  // Each module calls Router.register('risks', myRenderFunction) during init.
  const routes = {};

  /*
    register(hash, renderFunction) — Called by each module to announce:
    "If the URL hash is 'risks', call my render function."
  */
  function register(hash, renderFn) {
    routes[hash] = renderFn;
  }

  /*
    navigate(hash) — Programmatically changes the URL hash,
    which triggers handleRoute() via the hashchange event.
    Used after saving a form to go back to the list view.
  */
  function navigate(hash) {
    window.location.hash = hash;
  }

  /*
    handleRoute() — The core routing logic.
    1. Read the current hash from the URL
    2. Find the matching render function
    3. Update the active nav link highlight
    4. Call the render function, passing it the container div
  */
  function handleRoute() {
    // Remove the # prefix, default to 'dashboard' if hash is empty
    const hash    = window.location.hash.replace('#', '') || 'dashboard';
    const renderFn = routes[hash];

    // Update nav highlighting
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.classList.toggle('active', link.dataset.view === hash);
    });

    const container = document.getElementById('view-container');

    if (renderFn) {
      container.innerHTML = ''; // Clear current content
      renderFn(container);      // Render the new module into the container
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <h2>Page not found</h2>
          <p>No module registered for: #${hash}</p>
        </div>`;
    }
  }

  /*
    init() — Starts the router.
    Listens for URL hash changes, and handles the initial load.
  */
  function init() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute(); // Run immediately so the correct module loads on page open
  }

  return { register, navigate, init };

})();