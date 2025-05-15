// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBGu2enuIViecHRFckwviOPKI97em_tUbo",
    authDomain: "sfoxpos.firebaseapp.com",
    projectId: "sfoxpos",
    storageBucket: "sfoxpos.firebasestorage.app",
    messagingSenderId: "739127792690",
    appId: "1:739127792690:web:d331214eaffe9ec8eb182b",
    measurementId: "G-NQCT9S9XQF"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Main application function - renamed to billWallaApp for Alpine.js
window.billWallaApp = function() {
    return {
        user: null,
        currentSection: 'login',
        sidebarOpen: false,
        showRegisterForm: false,
        loginForm: {
            email: '',
            password: ''
        },
        registerForm: {
            email: '',
            password: '',
            shopName: ''
        },
        loginError: '',
        registerError: '',
        
        // Dashboard data
        pendingOrders: 0,
        lowStockItems: 0,
        
        // Todo data
        todos: [],
        newTodo: '',
        showAddTodoForm: false,
        
        // Billing data
        billing: {
            customerPhone: '',
            existingCustomer: null,
            showCustomerForm: false,
            showEditForm: false,
            newCustomer: {
                name: '',
                email: '',
                address: ''
            },
            editCustomer: {
                name: '',
                email: '',
                address: ''
            },
            productSearch: '',
            searchResults: [],
            items: [],
            paymentMethod: 'cash',
            cashAmount: 0,
            transactionId: '',
            notes: '',
            errorMessage: ''
        },
        
        // Inventory data
        inventory: {
            products: [],
            filteredProducts: [],
            searchQuery: '',
            categories: ['General', 'Electronics', 'Clothing', 'Food', 'Stationery'],
            showProductForm: false,
            editMode: false,
            currentProduct: {
                id: '',
                name: '',
                category: '',
                price: 0,
                stock: 0,
                description: ''
            },
            idError: '',
            newCategory: '',
            uploadedFile: null
        },
        
        // Customers data
        customers: {
            list: [],
            filteredCustomers: [],
            searchQuery: '',
            showCustomerForm: false,
            showDetailsModal: false,
            editMode: false,
            currentCustomer: {
                name: '',
                phone: '',
                email: '',
                address: ''
            },
            viewCustomer: {},
            customerBills: [],
            phoneError: ''
        },
        
        // Transactions data
        transactions: {
            list: [],
            filteredTransactions: [],
            searchQuery: '',
            filterType: 'all',
            dateFilter: 'all',
            showDetailsModal: false,
            viewTransaction: {
                id: '',
                date: '',
                customerName: '',
                customerPhone: '',
                items: [],
                subtotal: 0,
                tax: 0,
                total: 0,
                paymentMethod: '',
                notes: ''
            }
        },
        
        // Settings data
        settings: {
            shopName: 'My Shop',
            shopPhone: '',
            shopEmail: '',
            shopAddress: '',
            shopGST: '',
            upiId: '',
            taxRate: 18,
            billPrefix: 'BW',
            billFooter: 'Thank you for shopping with us!',
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
            passwordError: '',
            importFile: null
        },
        
        // Security data
        security: {
            appLockEnabled: false,
            lockTimeout: 5,
            lockPin: '',
            isLocked: false,
            loginHistory: []
        },
        lockScreenPin: '',
        lockError: '',
        
        // Category and bulk upload modals
        showCategoryModal: false,
        showBulkUploadModal: false,
        
        // Initialize the application
        init() {
            // Check if user is logged in
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    this.user = user;
                    this.currentSection = 'dashboard';
                    this.loadData();
                    
                    // Set up app lock timer if enabled
                    if (this.security.appLockEnabled) {
                        this.setupLockTimer();
                    }
                } else {
                    this.user = null;
                    this.currentSection = 'login';
                }
            });
            
            // Set up activity tracking for app lock
            document.addEventListener('mousemove', this.resetLockTimer.bind(this));
            document.addEventListener('keypress', this.resetLockTimer.bind(this));
            document.addEventListener('click', this.resetLockTimer.bind(this));
        },
        
        // Authentication methods
        login() {
            this.loginError = '';
            firebase.auth().signInWithEmailAndPassword(this.loginForm.email, this.loginForm.password)
                .then((userCredential) => {
                    this.user = userCredential.user;
                    this.currentSection = 'dashboard';
                    this.loadData();
                    
                    // Record login history
                    this.recordLogin();
                })
                .catch((error) => {
                    this.loginError = error.message;
                });
        },
        
        register() {
            this.registerError = '';
            firebase.auth().createUserWithEmailAndPassword(this.registerForm.email, this.registerForm.password)
                .then((userCredential) => {
                    this.user = userCredential.user;
                    this.settings.shopName = this.registerForm.shopName;
                    this.saveSettings();
                    this.currentSection = 'dashboard';
                    this.initializeData();
                })
                .catch((error) => {
                    this.registerError = error.message;
                });
        },
        
        logout() {
            firebase.auth().signOut()
                .then(() => {
                    this.user = null;
                    this.currentSection = 'login';
                })
                .catch((error) => {
                    console.error("Logout error:", error);
                });
        },
        
        // Navigation methods
        showSection(section) {
            this.currentSection = section;
            this.sidebarOpen = false;
            
            // Render charts if showing dashboard
            if (section === 'dashboard') {
                this.$nextTick(() => {
                    this.renderSalesChart();
                });
            }
        },
        
        toggleSidebar() {
            this.sidebarOpen = !this.sidebarOpen;
        },
        
        // Data loading and initialization
        loadData() {
            // Load settings
            const settingsData = localStorage.getItem(`billwalla_settings_${this.user.uid}`);
            if (settingsData) {
                this.settings = JSON.parse(settingsData);
            }
            
            // Load inventory
            const inventoryData = localStorage.getItem(`billwalla_inventory_${this.user.uid}`);
            if (inventoryData) {
                this.inventory.products = JSON.parse(inventoryData);
                this.inventory.filteredProducts = [...this.inventory.products];
            } else {
                this.inventory.products = this.generateSampleProducts();
                this.inventory.filteredProducts = [...this.inventory.products];
                this.saveInventory();
            }
            
            // Load customers
            const customersData = localStorage.getItem(`billwalla_customers_${this.user.uid}`);
            if (customersData) {
                this.customers.list = JSON.parse(customersData);
                this.customers.filteredCustomers = [...this.customers.list];
            } else {
                this.customers.list = this.generateSampleCustomers();
                this.customers.filteredCustomers = [...this.customers.list];
                this.saveCustomers();
            }
            
            // Load transactions
            const transactionsData = localStorage.getItem(`billwalla_transactions_${this.user.uid}`);
            if (transactionsData) {
                this.transactions.list = JSON.parse(transactionsData);
                this.transactions.filteredTransactions = [...this.transactions.list];
            } else {
                this.transactions.list = this.generateSampleTransactions();
                this.transactions.filteredTransactions = [...this.transactions.list];
                this.saveTransactions();
            }
            
            // Load todos
            const todosData = localStorage.getItem(`billwalla_todos_${this.user.uid}`);
            if (todosData) {
                this.todos = JSON.parse(todosData);
            }
            
            // Load security settings
            const securityData = localStorage.getItem(`billwalla_security_${this.user.uid}`);
            if (securityData) {
                this.security = JSON.parse(securityData);
            }
            
            // Calculate dashboard metrics
            this.calculateDashboardMetrics();
            
            // Render dashboard charts
            this.$nextTick(() => {
                if (this.currentSection === 'dashboard') {
                    this.renderSalesChart();
                }
            });
        },
        
        initializeData() {
            // Initialize with empty data for new users
            this.inventory.products = this.generateSampleProducts();
            this.inventory.filteredProducts = [...this.inventory.products];
            this.saveInventory();
            
            this.customers.list = [];
            this.customers.filteredCustomers = [];
            this.saveCustomers();
            
            this.transactions.list = [];
            this.transactions.filteredTransactions = [];
            this.saveTransactions();
            
            this.todos = [
                { text: 'Set up your shop information', completed: false, date: new Date().toISOString() },
                { text: 'Add your first product', completed: false, date: new Date().toISOString() },
                { text: 'Create your first bill', completed: false, date: new Date().toISOString() }
            ];
            this.saveTodos();
            
            this.security = {
                appLockEnabled: false,
                lockTimeout: 5,
                lockPin: '',
                isLocked: false,
                loginHistory: []
            };
            this.saveSecuritySettings();
            
            this.saveSettings();
        },
        
        // Generate sample data for demonstration
        generateSampleProducts() {
            return [
                { id: 'P001', name: 'Smartphone', category: 'Electronics', price: 15000, stock: 10, description: 'Latest model smartphone' },
                { id: 'P002', name: 'T-shirt', category: 'Clothing', price: 500, stock: 50, description: 'Cotton t-shirt' },
                { id: 'P003', name: 'Notebook', category: 'Stationery', price: 120, stock: 100, description: 'Ruled notebook' },
                { id: 'P004', name: 'Chocolate Bar', category: 'Food', price: 50, stock: 200, description: 'Milk chocolate' },
                { id: 'P005', name: 'Headphones', category: 'Electronics', price: 1200, stock: 15, description: 'Wireless headphones' }
            ];
        },
        
        generateSampleCustomers() {
            return [
                { name: 'Rahul Sharma', phone: '9876543210', email: 'rahul@example.com', address: '123 Main St, Delhi', visits: 5, lastVisit: new Date().toISOString() },
                { name: 'Priya Patel', phone: '8765432109', email: 'priya@example.com', address: '456 Park Ave, Mumbai', visits: 3, lastVisit: new Date().toISOString() }
            ];
        },
        
        generateSampleTransactions() {
            return [
                {
                    id: 'BW001',
                    date: new Date().toISOString(),
                    customerName: 'Rahul Sharma',
                    customerPhone: '9876543210',
                    items: [
                        { name: 'Smartphone', price: 15000, quantity: 1 },
                        { name: 'Headphones', price: 1200, quantity: 1 }
                    ],
                    subtotal: 16200,
                    tax: 2916,
                    total: 19116,
                    paymentMethod: 'card',
                    notes: 'First purchase'
                }
            ];
        },
        
        // Save data to localStorage
        saveInventory() {
            localStorage.setItem(`billwalla_inventory_${this.user.uid}`, JSON.stringify(this.inventory.products));
        },
        
        saveCustomers() {
            localStorage.setItem(`billwalla_customers_${this.user.uid}`, JSON.stringify(this.customers.list));
        },
        
        saveTransactions() {
            localStorage.setItem(`billwalla_transactions_${this.user.uid}`, JSON.stringify(this.transactions.list));
        },
        
        saveSettings() {
            localStorage.setItem(`billwalla_settings_${this.user.uid}`, JSON.stringify(this.settings));
        },
        
        saveTodos() {
            localStorage.setItem(`billwalla_todos_${this.user.uid}`, JSON.stringify(this.todos));
        },
        
        saveSecuritySettings() {
            localStorage.setItem(`billwalla_security_${this.user.uid}`, JSON.stringify(this.security));
        },
        
        // Dashboard methods
        calculateDashboardMetrics() {
            // Calculate low stock items
            this.lowStockItems = this.inventory.products.filter(p => p.stock < 10).length;
            
            // Calculate pending orders (placeholder for demo)
            this.pendingOrders = Math.floor(Math.random() * 5);
        },
        
        calculateTodaySales() {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            return this.transactions.list
                .filter(t => new Date(t.date) >= today)
                .reduce((total, t) => total + t.total, 0);
        },
        
        renderSalesChart() {
            const ctx = document.getElementById('salesChart');
            if (!ctx) return;
            
            // Generate last 7 days dates
            const dates = [];
            const sales = [];
            const now = new Date();
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                dates.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
                
                // Calculate sales for this day
                const dayStart = new Date(date);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(date);
                dayEnd.setHours(23, 59, 59, 999);
                
                const daySales = this.transactions.list
                    .filter(t => {
                        const transDate = new Date(t.date);
                        return transDate >= dayStart && transDate <= dayEnd;
                    })
                    .reduce((total, t) => total + t.total, 0);
                
                sales.push(daySales);
            }
            
            // Destroy existing chart if it exists
            if (window.salesChart) {
                window.salesChart.destroy();
            }
            
            // Create new chart
            window.salesChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Sales (₹)',
                        data: sales,
                        borderColor: '#0049ff',
                        backgroundColor: 'rgba(0, 73, 255, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)'
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: 'rgba(255, 255, 255, 0.7)'
                            }
                        }
                    }
                }
            });
        },
        
        // Todo methods
        addTodo() {
            if (!this.newTodo.trim()) return;
            
            this.todos.push({
                text: this.newTodo,
                completed: false,
                date: new Date().toISOString()
            });
            
            this.newTodo = '';
            this.showAddTodoForm = false;
            this.saveTodos();
        },
        
        deleteTodo(index) {
            this.todos.splice(index, 1);
            this.saveTodos();
        },
        
        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        },
        
        // Billing methods
        findCustomer() {
            if (!this.billing.customerPhone) {
                this.billing.errorMessage = 'Please enter a phone number';
                return;
            }
            
            const customer = this.customers.list.find(c => c.phone === this.billing.customerPhone);
            if (customer) {
                this.billing.existingCustomer = customer;
                this.billing.showCustomerForm = false;
                this.billing.showEditForm = false;
                this.billing.errorMessage = '';
            } else {
                this.billing.existingCustomer = null;
                this.billing.showCustomerForm = true;
                this.billing.showEditForm = false;
                this.billing.newCustomer = {
                    name: '',
                    email: '',
                    address: ''
                };
            }
        },
        
        saveNewCustomer() {
            if (!this.billing.newCustomer.name || !this.billing.newCustomer.address) {
                this.billing.errorMessage = 'Please fill all required fields';
                return;
            }
            
            const newCustomer = {
                name: this.billing.newCustomer.name,
                phone: this.billing.customerPhone,
                email: this.billing.newCustomer.email,
                address: this.billing.newCustomer.address,
                visits: 0,
                lastVisit: new Date().toISOString()
            };
            
            this.customers.list.push(newCustomer);
            this.customers.filteredCustomers = [...this.customers.list];
            this.saveCustomers();
            
            this.billing.existingCustomer = newCustomer;
            this.billing.showCustomerForm = false;
            this.billing.errorMessage = '';
        },
        
        editCustomer() {
            this.billing.editCustomer = {
                name: this.billing.existingCustomer.name,
                email: this.billing.existingCustomer.email,
                address: this.billing.existingCustomer.address
            };
            this.billing.showEditForm = true;
        },
        
        updateCustomer() {
            if (!this.billing.editCustomer.name || !this.billing.editCustomer.address) {
                this.billing.errorMessage = 'Please fill all required fields';
                return;
            }
            
            const index = this.customers.list.findIndex(c => c.phone === this.billing.existingCustomer.phone);
            if (index !== -1) {
                this.customers.list[index].name = this.billing.editCustomer.name;
                this.customers.list[index].email = this.billing.editCustomer.email;
                this.customers.list[index].address = this.billing.editCustomer.address;
                
                this.billing.existingCustomer = this.customers.list[index];
                this.saveCustomers();
            }
            
            this.billing.showEditForm = false;
            this.billing.errorMessage = '';
        },
        
        cancelEdit() {
            this.billing.showEditForm = false;
        },
        
        searchProducts() {
            if (!this.billing.productSearch) {
                this.billing.searchResults = [];
                return;
            }
            
            const query = this.billing.productSearch.toLowerCase();
            this.billing.searchResults = this.inventory.products.filter(product => 
                product.name.toLowerCase().includes(query) || 
                product.id.toLowerCase().includes(query)
            );
        },
        
        addToBill(product) {
            if (product.stock <= 0) {
                this.billing.errorMessage = 'Product out of stock';
                return;
            }
            
            const existingItem = this.billing.items.find(item => item.id === product.id);
            if (existingItem) {
                if (existingItem.quantity < product.stock) {
                    existingItem.quantity += 1;
                } else {
                    this.billing.errorMessage = 'Cannot add more than available stock';
                }
            } else {
                this.billing.items.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    stock: product.stock
                });
            }
            
            this.billing.productSearch = '';
            this.billing.searchResults = [];
            this.billing.errorMessage = '';
        },
        
        removeFromBill(index) {
            this.billing.items.splice(index, 1);
        },
        
        incrementQuantity(index) {
            const item = this.billing.items[index];
            if (item.quantity < item.stock) {
                item.quantity += 1;
            } else {
                this.billing.errorMessage = 'Cannot add more than available stock';
            }
        },
        
        decrementQuantity(index) {
            if (this.billing.items[index].quantity > 1) {
                this.billing.items[index].quantity -= 1;
            }
        },
        
        updateBillItem(index) {
            const item = this.billing.items[index];
            if (item.quantity > item.stock) {
                item.quantity = item.stock;
                this.billing.errorMessage = 'Quantity adjusted to available stock';
            } else if (item.quantity < 1) {
                item.quantity = 1;
            }
        },
        
        calculateSubtotal() {
            return this.billing.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        },
        
        calculateTax() {
            return this.calculateSubtotal() * (this.settings.taxRate / 100);
        },
        
        calculateTotal() {
            return this.calculateSubtotal() + this.calculateTax();
        },
        
        calculateChange() {
            const total = this.calculateTotal();
            return Math.max(0, this.billing.cashAmount - total);
        },
        
        canCompleteBill() {
            if (this.billing.items.length === 0) return false;
            if (!this.billing.existingCustomer) return false;
            
            if (this.billing.paymentMethod === 'cash') {
                return this.billing.cashAmount >= this.calculateTotal();
            }
            
            return true;
        },
        
        completeBill() {
            if (!this.canCompleteBill()) {
                this.billing.errorMessage = 'Please complete all required information';
                return;
            }
            
            // Generate bill ID
            const billPrefix = this.settings.billPrefix || 'BW';
            const billNumber = (this.transactions.list.length + 1).toString().padStart(3, '0');
            const billId = `${billPrefix}${billNumber}`;
            
            // Create transaction record
            const transaction = {
                id: billId,
                date: new Date().toISOString(),
                customerName: this.billing.existingCustomer.name,
                customerPhone: this.billing.existingCustomer.phone,
                items: this.billing.items.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                })),
                subtotal: this.calculateSubtotal(),
                tax: this.calculateTax(),
                total: this.calculateTotal(),
                paymentMethod: this.billing.paymentMethod,
                notes: this.billing.notes
            };
            
            // Add transaction ID for card payments
            if (this.billing.paymentMethod === 'card' && this.billing.transactionId) {
                transaction.transactionId = this.billing.transactionId;
            }
            
            // Update inventory
            this.billing.items.forEach(item => {
                const productIndex = this.inventory.products.findIndex(p => p.id === item.id);
                if (productIndex !== -1) {
                    this.inventory.products[productIndex].stock -= item.quantity;
                }
            });
            
            // Update customer visit count
            const customerIndex = this.customers.list.findIndex(c => c.phone === this.billing.existingCustomer.phone);
            if (customerIndex !== -1) {
                this.customers.list[customerIndex].visits = (this.customers.list[customerIndex].visits || 0) + 1;
                this.customers.list[customerIndex].lastVisit = new Date().toISOString();
            }
            
            // Save transaction
            this.transactions.list.unshift(transaction);
            this.transactions.filteredTransactions = [...this.transactions.list];
            
            // Save updated data
            this.saveInventory();
            this.saveCustomers();
            this.saveTransactions();
            
            // Reset billing form
            this.billing.items = [];
            this.billing.paymentMethod = 'cash';
            this.billing.cashAmount = 0;
            this.billing.transactionId = '';
            this.billing.notes = '';
            this.billing.errorMessage = '';
            
            // Show success message or print bill
            alert(`Bill ${billId} completed successfully!`);
        },
        
        // Inventory methods
        searchInventory() {
            if (!this.inventory.searchQuery) {
                this.inventory.filteredProducts = [...this.inventory.products];
                return;
            }
            
            const query = this.inventory.searchQuery.toLowerCase();
            this.inventory.filteredProducts = this.inventory.products.filter(product => 
                product.name.toLowerCase().includes(query) || 
                product.id.toLowerCase().includes(query) ||
                product.category.toLowerCase().includes(query)
            );
        },
        
        showAddProductForm() {
            this.inventory.currentProduct = {
                id: '',
                name: '',
                category: '',
                price: 0,
                stock: 0,
                description: ''
            };
            this.inventory.editMode = false;
            this.inventory.idError = '';
            this.inventory.showProductForm = true;
        },
        
        editProduct(product) {
            this.inventory.currentProduct = { ...product };
            this.inventory.editMode = true;
            this.inventory.idError = '';
            this.inventory.showProductForm = true;
        },
        
        closeProductForm() {
            this.inventory.showProductForm = false;
        },
        
        addProduct() {
            // Validate product ID is unique
            if (this.inventory.products.some(p => p.id === this.inventory.currentProduct.id)) {
                this.inventory.idError = 'Product ID already exists';
                return;
            }
            
            this.inventory.products.push({ ...this.inventory.currentProduct });
            this.inventory.filteredProducts = [...this.inventory.products];
            this.saveInventory();
            this.inventory.showProductForm = false;
        },
        
        updateProduct() {
            const index = this.inventory.products.findIndex(p => p.id === this.inventory.currentProduct.id);
            if (index !== -1) {
                this.inventory.products[index] = { ...this.inventory.currentProduct };
                this.inventory.filteredProducts = [...this.inventory.products];
                this.saveInventory();
            }
            this.inventory.showProductForm = false;
        },
        
        deleteProduct(productId) {
            if (confirm('Are you sure you want to delete this product?')) {
                this.inventory.products = this.inventory.products.filter(p => p.id !== productId);
                this.inventory.filteredProducts = [...this.inventory.products];
                this.saveInventory();
            }
        },
        
        addCategory() {
            if (!this.inventory.newCategory) return;
            
            if (!this.inventory.categories.includes(this.inventory.newCategory)) {
                this.inventory.categories.push(this.inventory.newCategory);
                this.inventory.newCategory = '';
                this.saveSettings();
            }
        },
        
        deleteCategory(index) {
            if (confirm('Are you sure you want to delete this category?')) {
                this.inventory.categories.splice(index, 1);
                this.saveSettings();
            }
        },
        
        handleFileUpload(event) {
            const file = event.target.files[0];
            if (file) {
                this.inventory.uploadedFile = file.name;
            }
        },
        
        processBulkUpload() {
            // In a real app, this would parse the CSV/Excel file
            // For demo purposes, we'll just show a success message
            alert('Bulk upload processed successfully!');
            this.showBulkUploadModal = false;
            this.inventory.uploadedFile = null;
        },
        
        // Customer methods
        searchCustomers() {
            if (!this.customers.searchQuery) {
                this.customers.filteredCustomers = [...this.customers.list];
                return;
            }
            
            const query = this.customers.searchQuery.toLowerCase();
            this.customers.filteredCustomers = this.customers.list.filter(customer => 
                customer.name.toLowerCase().includes(query) || 
                customer.phone.includes(query) ||
                (customer.email && customer.email.toLowerCase().includes(query))
            );
        },
        
        showAddCustomerForm() {
            this.customers.currentCustomer = {
                name: '',
                phone: '',
                email: '',
                address: ''
            };
            this.customers.editMode = false;
            this.customers.phoneError = '';
            this.customers.showCustomerForm = true;
        },
        
        editCustomerDetails(customer) {
            this.customers.currentCustomer = { ...customer };
            this.customers.editMode = true;
            this.customers.phoneError = '';
            this.customers.showCustomerForm = true;
        },
        
        closeCustomerForm() {
            this.customers.showCustomerForm = false;
        },
        
        addCustomer() {
            // Validate phone number is unique
            if (this.customers.list.some(c => c.phone === this.customers.currentCustomer.phone)) {
                this.customers.phoneError = 'Phone number already exists';
                return;
            }
            
            const newCustomer = {
                ...this.customers.currentCustomer,
                visits: 0,
                lastVisit: null
            };
            
            this.customers.list.push(newCustomer);
            this.customers.filteredCustomers = [...this.customers.list];
            this.saveCustomers();
            this.customers.showCustomerForm = false;
        },
        
        updateCustomerDetails() {
            const index = this.customers.list.findIndex(c => c.phone === this.customers.currentCustomer.phone);
            if (index !== -1) {
                this.customers.list[index] = { 
                    ...this.customers.list[index],
                    name: this.customers.currentCustomer.name,
                    email: this.customers.currentCustomer.email,
                    address: this.customers.currentCustomer.address
                };
                this.customers.filteredCustomers = [...this.customers.list];
                this.saveCustomers();
            }
            this.customers.showCustomerForm = false;
        },
        
        deleteCustomer(phone) {
            if (confirm('Are you sure you want to delete this customer?')) {
                this.customers.list = this.customers.list.filter(c => c.phone !== phone);
                this.customers.filteredCustomers = [...this.customers.list];
                this.saveCustomers();
            }
        },
        
        viewCustomerDetails(customer) {
            this.customers.viewCustomer = { ...customer };
            
            // Get customer's bills
            this.customers.customerBills = this.transactions.list.filter(
                t => t.customerPhone === customer.phone
            );
            
            this.customers.showDetailsModal = true;
        },
        
        // Transaction methods
        searchTransactions() {
            this.filterTransactions();
        },
        
        filterTransactions() {
            let filtered = [...this.transactions.list];
            
            // Filter by search query
            if (this.transactions.searchQuery) {
                const query = this.transactions.searchQuery.toLowerCase();
                filtered = filtered.filter(transaction => 
                    transaction.id.toLowerCase().includes(query) || 
                    transaction.customerName.toLowerCase().includes(query) ||
                    transaction.customerPhone.includes(query)
                );
            }
            
            // Filter by payment method
            if (this.transactions.filterType !== 'all') {
                filtered = filtered.filter(transaction => 
                    transaction.paymentMethod === this.transactions.filterType
                );
            }
            
            // Filter by date
            if (this.transactions.dateFilter !== 'all') {
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                
                if (this.transactions.dateFilter === 'today') {
                    filtered = filtered.filter(transaction => {
                        const transDate = new Date(transaction.date);
                        return transDate >= today;
                    });
                } else if (this.transactions.dateFilter === 'week') {
                    const weekStart = new Date(today);
                    weekStart.setDate(today.getDate() - today.getDay());
                    filtered = filtered.filter(transaction => {
                        const transDate = new Date(transaction.date);
                        return transDate >= weekStart;
                    });
                } else if (this.transactions.dateFilter === 'month') {
                    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                    filtered = filtered.filter(transaction => {
                        const transDate = new Date(transaction.date);
                        return transDate >= monthStart;
                    });
                }
            }
            
            this.transactions.filteredTransactions = filtered;
        },
        
        viewTransactionDetails(transaction) {
            this.transactions.viewTransaction = { ...transaction };
            this.transactions.showDetailsModal = true;
        },
        
        deleteTransaction(transactionId) {
            if (confirm('Are you sure you want to delete this transaction?')) {
                this.transactions.list = this.transactions.list.filter(t => t.id !== transactionId);
                this.transactions.filteredTransactions = [...this.transactions.list];
                this.saveTransactions();
            }
        },
        
        printBill(transaction) {
            // In a real app, this would open a print dialog with formatted bill
            alert('Print functionality would be implemented here');
        },
        
        calculateTotalSales() {
            return this.transactions.filteredTransactions.reduce((total, t) => total + t.total, 0);
        },
        
        calculateAverageBill() {
            if (this.transactions.filteredTransactions.length === 0) return 0;
            return this.calculateTotalSales() / this.transactions.filteredTransactions.length;
        },
        
        getDateRangeText() {
            switch (this.transactions.dateFilter) {
                case 'today': return 'Today';
                case 'week': return 'This Week';
                case 'month': return 'This Month';
                default: return 'All Time';
            }
        },
        
        // Settings methods
        saveShopSettings() {
            this.saveSettings();
            alert('Settings saved successfully!');
        },
        
        changePassword() {
            this.settings.passwordError = '';
            
            if (this.settings.newPassword !== this.settings.confirmPassword) {
                this.settings.passwordError = 'Passwords do not match';
                return;
            }
            
            const user = firebase.auth().currentUser;
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email, 
                this.settings.currentPassword
            );
            
            user.reauthenticateWithCredential(credential)
                .then(() => {
                    return user.updatePassword(this.settings.newPassword);
                })
                .then(() => {
                    alert('Password updated successfully!');
                    this.settings.currentPassword = '';
                    this.settings.newPassword = '';
                    this.settings.confirmPassword = '';
                })
                .catch((error) => {
                    this.settings.passwordError = error.message;
                });
        },
        
        exportData(type) {
            let data;
            let filename;
            
            switch (type) {
                case 'inventory':
                    data = this.inventory.products;
                    filename = 'billwalla_inventory.json';
                    break;
                case 'customers':
                    data = this.customers.list;
                    filename = 'billwalla_customers.json';
                    break;
                case 'transactions':
                    data = this.transactions.list;
                    filename = 'billwalla_transactions.json';
                    break;
                case 'all':
                    data = {
                        inventory: this.inventory.products,
                        customers: this.customers.list,
                        transactions: this.transactions.list,
                        settings: this.settings
                    };
                    filename = 'billwalla_all_data.json';
                    break;
            }
            
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },
        
        handleImportFile(event) {
            const file = event.target.files[0];
            if (file) {
                this.settings.importFile = file.name;
            }
        },
        
        importData() {
            // In a real app, this would parse the JSON file and import the data
            alert('Import functionality would be implemented here');
            this.settings.importFile = null;
        },
        
        confirmClearData() {
            if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                if (confirm('This will delete all inventory, customers, and transactions. Are you REALLY sure?')) {
                    this.inventory.products = [];
                    this.inventory.filteredProducts = [];
                    this.customers.list = [];
                    this.customers.filteredCustomers = [];
                    this.transactions.list = [];
                    this.transactions.filteredTransactions = [];
                    
                    this.saveInventory();
                    this.saveCustomers();
                    this.saveTransactions();
                    
                    alert('All data has been cleared.');
                }
            }
        },
        
        confirmDeleteAccount() {
            if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                if (confirm('This will permanently delete your account and all data. Are you REALLY sure?')) {
                    const user = firebase.auth().currentUser;
                    
                    user.delete()
                        .then(() => {
                            // Clear all local data
                            localStorage.removeItem(`billwalla_inventory_${user.uid}`);
                            localStorage.removeItem(`billwalla_customers_${user.uid}`);
                            localStorage.removeItem(`billwalla_transactions_${user.uid}`);
                            localStorage.removeItem(`billwalla_settings_${user.uid}`);
                            localStorage.removeItem(`billwalla_todos_${user.uid}`);
                            localStorage.removeItem(`billwalla_security_${user.uid}`);
                            
                            alert('Your account has been deleted.');
                            this.user = null;
                            this.currentSection = 'login';
                        })
                        .catch((error) => {
                            alert('Error: ' + error.message);
                        });
                }
            }
        },
        
        // Security methods
        saveSecuritySettings() {
            if (this.security.appLockEnabled && !this.security.lockPin) {
                alert('Please set a PIN code to enable app lock');
                return;
            }
            
            this.saveSecuritySettings();
            
            if (this.security.appLockEnabled) {
                this.setupLockTimer();
            }
            
            alert('Security settings saved successfully!');
        },
        
        setupLockTimer() {
            // Clear existing timer if any
            if (this.lockTimer) {
                clearTimeout(this.lockTimer);
            }
            
            // Set up new timer
            this.lockTimer = setTimeout(() => {
                this.security.isLocked = true;
            }, this.security.lockTimeout * 60 * 1000);
        },
        
        resetLockTimer() {
            if (this.security.appLockEnabled && !this.security.isLocked) {
                this.setupLockTimer();
            }
        },
        
        unlockApp() {
            if (this.lockScreenPin === this.security.lockPin) {
                this.security.isLocked = false;
                this.lockScreenPin = '';
                this.lockError = '';
                this.setupLockTimer();
            } else {
                this.lockError = 'Incorrect PIN';
            }
        },
        
        recordLogin() {
            // Get device info
            const deviceInfo = {
                browser: navigator.userAgent,
                platform: navigator.platform
            };
            
            // Create login record
            const loginRecord = {
                date: new Date().toISOString(),
                device: `${deviceInfo.platform} - ${deviceInfo.browser.split(' ')[0]}`,
                ip: '192.168.1.1' // In a real app, this would be the actual IP
            };
            
            // Add to login history
            this.security.loginHistory.unshift(loginRecord);
            
            // Keep only last 10 logins
            if (this.security.loginHistory.length > 10) {
                this.security.loginHistory = this.security.loginHistory.slice(0, 10);
            }
            
            this.saveSecuritySettings();
        }
    };
};