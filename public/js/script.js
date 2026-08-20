(() => {
  'use strict'

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }

      form.classList.add('was-validated')
    }, false)
  })
})()

const TAX_RATE = 0.18;

function formatIndianCurrency(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function updateListingPrices(showTax) {
  const listingPrices = document.querySelectorAll('.listing-price');
  const taxInfoNodes = document.querySelectorAll('.tax-info');

  listingPrices.forEach((priceNode) => {
    const basePrice = Number(priceNode.dataset.basePrice || 0);
    const priceToDisplay = showTax ? Math.round(basePrice * (1 + TAX_RATE)) : basePrice;
    priceNode.textContent = formatIndianCurrency(priceToDisplay);
  });

  taxInfoNodes.forEach((infoNode) => {
    infoNode.style.display = showTax ? 'inline' : 'none';
  });
}

function wireCategoryFilters() {
  const filtersContainer = document.getElementById('filters');
  if (!filtersContainer) {
    return;
  }

  const filters = filtersContainer.querySelectorAll('.filter[data-category]');
  const url = new URL(window.location.href);
  const activeCategory = (url.searchParams.get('category') || '').trim().toLowerCase();

  filters.forEach((filterNode) => {
    const category = (filterNode.dataset.category || '').trim();
    if (!category) {
      return;
    }

    if (category.toLowerCase() === activeCategory) {
      filterNode.style.opacity = '1';
    }

    filterNode.addEventListener('click', () => {
      const nextUrl = new URL('/listings', window.location.origin);
      const search = (url.searchParams.get('search') || '').trim();

      if (search) {
        nextUrl.searchParams.set('search', search);
      }

      if (category.toLowerCase() !== 'trending') {
        nextUrl.searchParams.set('category', category);
      }

      window.location.href = nextUrl.toString();
    });
  });
}

function wireTaxToggle() {
  const taxSwitch = document.getElementById('switchCheckDefault');
  if (!taxSwitch) {
    return;
  }

  updateListingPrices(Boolean(taxSwitch.checked));
  taxSwitch.addEventListener('change', () => {
    updateListingPrices(Boolean(taxSwitch.checked));
  });
}

wireCategoryFilters();
wireTaxToggle();