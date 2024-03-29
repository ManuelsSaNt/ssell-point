
const { contextBridge , ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('mainView', {

	nexNumOrder: () => {
		return ipcRenderer.invoke('nexNumOrder');
	},
	
	//* -- ORDERS EVENTS --
	modOrder: () => {
		ipcRenderer.invoke('modOrder', orderData()).then((result) => {
			return result;
		});
	},
	
	delOrder: () => {
		const result = ipcRenderer.invoke('delOrder', orderData().id).then((result) => {
			return result;
		});
	
		return result;
	},

	saveOrder: (orderData) => {
		ipcRenderer.send('saveOrder', orderData);
	},

	getOrders: (filters) => {
		ipcRenderer.invoke('getOrders', filters).then((orders) => {
			const table = document.getElementById('tbodypa');
			table.innerHTML = ''; // removes all rows for clean the table
			orders.forEach(ord => {
				buildRow(ord, table);
			});
		});
	},
	//! -- ORDERS EVENTS --

	//* -- PRODUCTS EVENTS --
	writeProducts: (stringProducts) => {
		ipcRenderer.send('writeProducts', stringProducts);
	},

	getProducts: async () => {
		return await ipcRenderer.invoke('getProducts');
	},

	getProductsAndCategory: async () => {
		return await ipcRenderer.invoke('getProductsAndCategory');
	},

	deleteProduct: async (id) => {
		return await ipcRenderer.send('deleteProduct', id);
	},

	getProductsStats: () => {
		const stats = ipcRenderer.invoke('getProductsStats').then(result => {
			return result;
		});

		return stats;
	},
	
	saveProduct: (productInfo) => {
		return ipcRenderer.invoke('saveProduct', productInfo).then(result => {

			console.log(result);
			return true;
		}).catch(err => {
			console.log(err);
			return false;
		});
	},
	//! -- PRODUCTS EVENTS --


	print: (data) => {
		ipcRenderer.send('printTime', JSON.stringify(data));
	},

	setInfoListener: () => {
		const notes = document.getElementById('notasInput');
		const direction = document.getElementById('directionInput');

		ipcRenderer.on('replyClient', (event, data) => {
			notes.value = data['name'] + ', ' + data['phone'];
			direction.value = data['direction'];
		});
	},

	openReq: () => {
		ipcRenderer.send('openClients');
	},

	checkPassword: (password) => {
		const result = ipcRenderer.invoke('checkPassword', password).then((result) => {
			return result;
		});

		return result;
	},
	
	getCategories: async () => {
		return await ipcRenderer.invoke('getCategories');
	},

	getTotalSells: async () => {
		return await ipcRenderer.invoke('getTotalSells');
	},
	
});


const orderData = () => {
	const id = document.getElementById('field-id').value;
	const hour = document.getElementById('field-i-hour').value;
	const cost = document.getElementById('field-i-cost').value;
	const products = document.getElementById('field-i-products').value;
	const address = document.getElementById('field-i-address').value;
	const payMethod = document.getElementById('field-i-pay-method').value;
	
	return {
		id: id,
		hour: hour,
		cost: cost.replace('$', ''),
		products: products,
		address: address,
		payMethod: payMethod
	};

};

const buildRow = (order, table) => {

	const editId = document.getElementById('field-id');
	const editHour = document.getElementById('field-i-hour');
	const editCost = document.getElementById('field-i-cost');
	const editProducts = document.getElementById('field-i-products');
	const editAddress = document.getElementById('field-i-address');
	const editPayMethod = document.getElementById('field-i-pay-method');

	const id = order.id;
	const time = order.time.slice(0, -3);
	const cost = order.cost;
	const products = order.products;
	const address = order.address === '' ? 'local' : order.address;
	const payMethod = order.pay_method;
	
	const tr = document.createElement('TR');

	tr.className = 'row-w-click';


	tr.addEventListener('click', () => {
		editId.value = id;
		editHour.value = time;
		editCost.value = cost;
		editProducts.value = products;
		editAddress.value = address;
		editPayMethod.value = payMethod;
	});

	const thId = document.createElement('TH');
	thId.textContent = id;

	const tdTime = document.createElement('TD');
	tdTime.textContent = time;

	const tdCost = document.createElement('TD');
	tdCost.textContent = '$' + cost;

	const tdProducts = document.createElement('TD');
	tdProducts.textContent = products;

	const tdAddress = document.createElement('TD');
	tdAddress.textContent = address;
	
	const tdPayMethod = document.createElement('TD');
	tdPayMethod.textContent = order.pay_method;

	tr.append(thId);
	tr.append(tdTime);
	tr.append(tdCost);
	tr.append(tdProducts);
	tr.append(tdAddress);
	tr.append(tdPayMethod);

	table.append(tr);
};
