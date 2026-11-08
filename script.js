let products = [];

// Your store WhatsApp number
const whatsappNumber = "919885257570";

// Safely display text from the database
function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// Create product card
function createProductCard(product) {
    const priceText = product.showPrice && product.price !== null
        ? "₹" + Number(product.price).toLocaleString("en-IN")
        : "Contact for Price";

    const tag = product.isNew
        ? '<span class="product-tag">New Arrival</span>'
        : "";

    const availabilityText = product.availability === "Sold Out"
        ? '<p class="sold-out">Sold Out</p>'
        : '<p class="available">Available</p>';

    const image = product.images?.[0] || "";

    const imageHTML = image
        ? `<img class="product-image"
                src="${escapeHtml(image)}"
                alt="${escapeHtml(product.name)}"
                data-image="${escapeHtml(image)}">`
        : '<div class="product-image-placeholder">No photo available</div>';

    const enquiryMessage = encodeURIComponent(
    `Hello! I am interested in this product.

Product Name: ${product.name}
Category: ${product.category}
Price: ${product.showPrice && product.price !== null
        ? "₹" + Number(product.price).toLocaleString("en-IN")
        : "Contact for Price"}
Description: ${product.description}
Sizes: ${product.sizes}
Colours: ${product.colours}

Please share more details.`

    );

    return `
        <div class="product-card">
            ${imageHTML}

            <div class="product-info">
                ${tag}
                <h3>${escapeHtml(product.name)}</h3>
                <p><strong>Category:</strong> ${escapeHtml(product.category)}</p>
                <p><strong>Price:</strong> ${priceText}</p>
                <p>${escapeHtml(product.description)}</p>
                <p><strong>Sizes:</strong> ${escapeHtml(product.sizes)}</p>
                <p><strong>Colours:</strong> ${escapeHtml(product.colours)}</p>
                ${availabilityText}

                ${
                    product.availability === "Available"
                    ? `<a class="enquiry-button"
                         href="https://wa.me/${whatsappNumber}?text=${enquiryMessage}"
                         target="_blank"
                         rel="noopener">Enquire on WhatsApp</a>`
                    : ""
                }
            </div>
        </div>
    `;
}

// Make product photos clickable
function attachImageHandlers(container) {
    container.querySelectorAll(".product-image").forEach(img => {
        img.addEventListener("click", function() {
            openImage(this.dataset.image);
        });

        img.addEventListener("error", function() {
            this.style.display = "none";
        });
    });
}

// Display products
function displayProducts() {
    const container = document.getElementById("productContainer");
    const newContainer = document.getElementById("newProducts");
    const featuredContainer = document.getElementById("featuredProducts");

    const search = document.getElementById("searchInput").value.toLowerCase();
    const category = document.getElementById("categoryFilter").value;
    const availability = document.getElementById("availabilityFilter").value;
    const arrival = document.getElementById("arrivalFilter").value;

    const filtered = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(search);
        const matchesCategory = category === "all" ||
            product.category === category;
        const matchesAvailability = availability === "all" ||
            product.availability === availability;
        const matchesArrival = arrival === "all" || product.isNew;

        return matchesSearch &&
            matchesCategory &&
            matchesAvailability &&
            matchesArrival;
    });

    container.innerHTML = filtered.length
        ? filtered.map(createProductCard).join("")
        : "<p>No products found.</p>";

    const newProducts = products.filter(p => p.isNew);
    const featuredProducts = products.filter(p => p.featured);

    newContainer.innerHTML = newProducts.length
        ? newProducts.map(createProductCard).join("")
        : "<p>New arrivals coming soon!</p>";

    featuredContainer.innerHTML = featuredProducts.length
        ? featuredProducts.map(createProductCard).join("")
        : "<p>Featured products coming soon!</p>";

    attachImageHandlers(container);
    attachImageHandlers(newContainer);
    attachImageHandlers(featuredContainer);
}

// Load products from Supabase
async function loadProducts() {
    const container = document.getElementById("productContainer");

    container.innerHTML = "<p>Loading products...</p>";

    const { data, error } = await supabaseClient
        .from("products")
        .select("*");

    if (error) {
        console.error("Product loading error:", error);
        container.innerHTML =
            "<p>Unable to load products. Please try again later.</p>";
        return;
    }

    products = data.map(item => ({
        id: item.id,
        name: item.name || "",
        category: item.category || "",
        price: item.price,
        showPrice: item.show_price,
        description: item.description || "",
        sizes: item.sizes || "",
        colours: item.colours || "",
        availability: item.availability || "Available",
        isNew: item.is_new || false,
        featured: item.is_featured || false,
        images: item.images || []
    }));

    displayProducts();
}
// Load categories dynamically from Supabase
async function loadHomepageCategories() {
    const dropdown = document.getElementById("categoryFilter");

    const { data, error } = await supabaseClient
        .from("categories")
        .select("name")
        .order("name");

    if (error) {
        console.error("Category loading error:", error);
        return;
    }

    if (data && data.length > 0) {
        dropdown.innerHTML = '<option value="all">All Categories</option>';

        data.forEach(category => {
            const option = document.createElement("option");
            option.value = category.name;
            option.textContent = category.name;
            dropdown.appendChild(option);
        });
    }
}
// Category buttons
function selectCategory(category) {
    document.getElementById("categoryFilter").value = category;
    document.getElementById("arrivalFilter").value = "all";
    document.getElementById("availabilityFilter").value = "all";

    displayProducts();

    document.getElementById("products").scrollIntoView({
        behavior: "smooth"
    });
}

// Image popup
function openImage(imageSource) {
    const modal = document.getElementById("imageModal");
    const modalImage = document.getElementById("modalImage");

    modalImage.src = imageSource;
    modal.style.display = "flex";
}

function closeImage() {
    document.getElementById("imageModal").style.display = "none";
}

// Make functions available to existing HTML
window.selectCategory = selectCategory;
window.openImage = openImage;
window.closeImage = closeImage;

// Close popup when clicking outside image
document.getElementById("imageModal").addEventListener("click", function(event) {
    if (event.target === this) {
        closeImage();
    }
});

// Search and filters
document.getElementById("searchInput").addEventListener("input", displayProducts);
document.getElementById("categoryFilter").addEventListener("change", displayProducts);
document.getElementById("availabilityFilter").addEventListener("change", displayProducts);
document.getElementById("arrivalFilter").addEventListener("change", displayProducts);

// Offers placeholder
document.getElementById("offersContainer").innerHTML =
    "<p>Check our store for the latest special offers and collections!</p>";

// Current year
document.getElementById("year").textContent = new Date().getFullYear();

// Load products when homepage opens
loadProducts();
loadHomepageCategories();