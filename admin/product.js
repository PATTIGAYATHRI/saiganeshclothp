const productForm = document.getElementById("productForm");
const productList = document.getElementById("productList");
const message = document.getElementById("message");

const photoInput = document.getElementById("productPhotos");
const submitButton = productForm.querySelector('button[type="submit"]');

let editingProductId = null;
let oldImageUrls = [];

photoInput.required = false;

// Escape text before displaying it in HTML
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function(char) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char];
    });
}

// Upload selected photos to Supabase
async function uploadPhotos(files) {
    const imageUrls = [];

    for (const file of files) {
        const filePath = `${crypto.randomUUID()}-${file.name}`;

        const { error } = await supabaseClient
            .storage
            .from("product-images")
            .upload(filePath, file);

        if (error) throw error;

        const { data } = supabaseClient
            .storage
            .from("product-images")
            .getPublicUrl(filePath);

        imageUrls.push(data.publicUrl);
    }

    return imageUrls;
}

// Display all products
async function loadAdminProducts() {
    productList.innerHTML = "<p>Loading products...</p>";

    const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        productList.innerHTML =
            `<p>Unable to load products: ${escapeHTML(error.message)}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        productList.innerHTML = "<p>No products added yet.</p>";
        return;
    }

    productList.innerHTML = data.map(product => {
        const images = Array.isArray(product.images)
            ? product.images
            : [];

        const firstImage = images[0] || "";

        return `
            <div style="
                border:1px solid #ddd;
                padding:15px;
                margin-bottom:15px;
                border-radius:10px;
                background:#fffaf2;
            ">
                ${firstImage ? `
                    <img
                        src="${escapeHTML(firstImage)}"
                        alt="${escapeHTML(product.name)}"
                        style="width:120px;height:120px;object-fit:cover;border-radius:8px;"
                    >
                ` : ""}

                <h3>${escapeHTML(product.name)}</h3>

                <p>Category: ${escapeHTML(product.category)}</p>

                <p>Price: ${
                    product.show_price && product.price != null
                    ? "₹" + escapeHTML(product.price)
                    : "Contact for Price"
                }</p>

                <p>Availability: ${escapeHTML(product.availability || "Available")}</p>

                <button type="button" onclick="editProduct('${product.id}')">
                    Edit
                </button>

                <button
                    type="button"
                    onclick="deleteProduct('${product.id}')"
                    style="background:#a32626;"
                >
                    Delete
                </button>
            </div>
        `;
    }).join("");
}

// Edit a product
async function editProduct(id) {
    const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        alert("Unable to open product: " + error.message);
        return;
    }

    editingProductId = id;
    oldImageUrls = Array.isArray(data.images) ? data.images : [];

    document.getElementById("productName").value = data.name || "";
    document.getElementById("productCategory").value = data.category || "";
    document.getElementById("productPrice").value = data.price ?? "";
    document.getElementById("productDescription").value = data.description || "";
    document.getElementById("productSizes").value = data.sizes || "";
    document.getElementById("productColours").value = data.colours || "";
    document.getElementById("productAvailability").value =
        data.availability || "Available";

    document.getElementById("showPrice").checked = data.show_price ?? true;
    document.getElementById("isNew").checked = data.is_new ?? false;
    document.getElementById("isFeatured").checked =
        data.is_featured ?? false;

    photoInput.value = "";

    submitButton.textContent = "Update Product";
    message.textContent = "Editing: " + data.name;

    let cancelButton = document.getElementById("cancelEdit");

    if (!cancelButton) {
        cancelButton = document.createElement("button");
        cancelButton.id = "cancelEdit";
        cancelButton.type = "button";
        cancelButton.textContent = "Cancel Edit";
        cancelButton.style.marginLeft = "10px";
        submitButton.after(cancelButton);

        cancelButton.addEventListener("click", cancelEdit);
    }

    document.getElementById("productForm").scrollIntoView({
        behavior: "smooth"
    });
}

// Cancel editing
function cancelEdit() {
    editingProductId = null;
    oldImageUrls = [];

    productForm.reset();
    photoInput.value = "";
    submitButton.textContent = "Add Product";
    message.textContent = "";

    const cancelButton = document.getElementById("cancelEdit");

    if (cancelButton) {
        cancelButton.remove();
    }
}

// Delete a product
async function deleteProduct(id) {
    const confirmed = confirm(
        "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    const { error } = await supabaseClient
        .from("products")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Delete failed: " + error.message);
        return;
    }

    if (editingProductId == id) {
        cancelEdit();
    }

    alert("Product deleted successfully!");
    loadAdminProducts();
}

// Add or update product
productForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    try {
        message.textContent = "Saving product...";

        const files = photoInput.files;
        let imageUrls = oldImageUrls;

        if (files.length > 0) {
            imageUrls = await uploadPhotos(files);
        } else if (!editingProductId) {
            message.textContent = "Please select product photos.";
            return;
        }

        const productData = {
            name: document.getElementById("productName").value.trim(),
            category: document.getElementById("productCategory").value,
            price: document.getElementById("productPrice").value
                ? Number(document.getElementById("productPrice").value)
                : null,
            show_price: document.getElementById("showPrice").checked,
            description: document.getElementById("productDescription").value,
            sizes: document.getElementById("productSizes").value,
            colours: document.getElementById("productColours").value,
            availability: document.getElementById("productAvailability").value,
            is_new: document.getElementById("isNew").checked,
            is_featured: document.getElementById("isFeatured").checked,
            images: imageUrls
        };

        let error;

        if (editingProductId) {
            ({ error } = await supabaseClient
                .from("products")
                .update(productData)
                .eq("id", editingProductId));
        } else {
            ({ error } = await supabaseClient
                .from("products")
                .insert(productData));
        }

        if (error) throw error;

        message.style.color = "green";
        message.textContent = editingProductId
            ? "Product updated successfully!"
            : "Product added successfully!";

        editingProductId = null;
        oldImageUrls = [];

        productForm.reset();
        photoInput.value = "";
        submitButton.textContent = "Add Product";

        const cancelButton = document.getElementById("cancelEdit");

        if (cancelButton) {
            cancelButton.remove();
        }

        await loadAdminProducts();

    } catch (error) {
        console.error(error);
        message.style.color = "red";
        message.textContent = "Error: " + error.message;
    }
});

// Load products when dashboard opens
loadAdminProducts();
// ===============================
// CATEGORY MANAGEMENT
// ===============================

const categoryForm = document.getElementById("categoryForm");
const categoryList = document.getElementById("categoryList");
const categoryMessage = document.getElementById("categoryMessage");

const categoryDropdown = document.getElementById("productCategory");

// Load categories
async function loadCategories() {
    const { data, error } = await supabaseClient
        .from("categories")
        .select("*")
        .order("name");

    if (error) {
        categoryList.textContent = "Error: " + error.message;
        return;
    }

    if (!data || data.length === 0) {
        categoryList.innerHTML = "<p>No categories added yet.</p>";
    } else {
        categoryList.innerHTML = data.map(category => `
            <div style="
                padding:12px;
                margin:8px 0;
                border:1px solid #ddd;
                border-radius:8px;
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:10px;
            ">
                <strong>${escapeHTML(category.name)}</strong>

                <button
                    type="button"
                    onclick="deleteCategory('${category.id}', '${escapeHTML(category.name)}')"
                    style="background:#a32626;"
                >
                    Delete
                </button>
            </div>
        `).join("");
    }

    // Update product category dropdown
    if (categoryDropdown) {
        const currentValue = categoryDropdown.value;

        categoryDropdown.innerHTML =
            '<option value="">Select Category</option>';

        data.forEach(category => {
            const option = document.createElement("option");
            option.value = category.name;
            option.textContent = category.name;
            categoryDropdown.appendChild(option);
        });

        categoryDropdown.value = currentValue;
    }
}

// Add a category
categoryForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const name = document.getElementById("categoryName")
        .value.trim();

    if (!name) return;

    categoryMessage.textContent = "Adding category...";

    const { error } = await supabaseClient
        .from("categories")
        .insert({ name });

    if (error) {
        categoryMessage.textContent = "Error: " + error.message;
        categoryMessage.style.color = "red";
        return;
    }

    categoryMessage.textContent = "Category added successfully!";
    categoryMessage.style.color = "green";

    categoryForm.reset();

    await loadCategories();
});

// Delete a category
async function deleteCategory(id, name) {
    const { count, error: checkError } = await supabaseClient
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("category", name);

    if (checkError) {
        alert("Unable to check products: " + checkError.message);
        return;
    }

    if (count > 0) {
        alert("This category contains products. Move those products to another category before deleting it.");
        return;
    }

    if (!confirm("Delete category " + name + "?")) return;

    const { error } = await supabaseClient
        .from("categories")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Delete failed: " + error.message);
        return;
    }

    alert("Category deleted successfully!");

    await loadCategories();
}

// Load categories when dashboard opens
loadCategories();