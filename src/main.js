
// Electron Core
const { app, BrowserWindow , ipcMain, protocol } = require('electron');

// Native Modules
const path = require('path');
const fs = require('fs/promises');

// extrnal modules and libraries
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
// const {PosPrinter} = require('electron-pos-printer');

// personal modules
const AppDirs = require('./paths');

const dbConf = {
	host: '127.0.0.1',
	user: 'root',
	port: '3306',
	database: 'tiburon_sp',
	password: 'Q7f00h&OLio$uWF%li0A'
};

let conn;

const initializeDbConnection = async () => {
	conn = await mysql.createConnection(dbConf);
}

initializeDbConnection();

async function makeQuery(query) {
	const [rows] = await conn.execute(query);
	return rows;
}

/**
 * electron reload code
 */
if (process.env.NODE_ENV !== 'production') {
	require('electron-reload')(__dirname, {});
}


// Obtaining the Actual date
const date = new Date();
const arrDate = date.toLocaleDateString().split('/');

const checkLen = (date) => {
	return `${date}`.length > 1 ? `${date}` : `0${date}`;
};

const hours = checkLen(date.getHours() - 1);
const minutes = checkLen(date.getMinutes());

const getActualDate = (wTime) => {

	if (wTime){
		return `${arrDate[2]}-${checkLen(arrDate[0])}-${checkLen(arrDate[1])} ${hours}:${minutes}:00`;
	}

	if (date.getHours() === 0){
		return `${arrDate[2]}-${checkLen(arrDate[0])}-${checkLen(parseInt(arrDate[1]) - 1)}`;
	}
	
	return `${arrDate[2]}-${checkLen(arrDate[1])}-${checkLen(arrDate[0])}`;
	
};

// globals
const productsPath = path.join(__dirname , 'views', 'mocks', 'prices.json');

const actualDate = getActualDate(false).split('-');
const formatForDb = `${actualDate[0]}-${actualDate[2]}-${actualDate[1]}`;

/**
 * 'tellerView' -> is the window for checker and his view, is the employee view
 */
const tellerView = () => {
	const win = new BrowserWindow({
		maximizable: true,
		width: 1600,
		height: 900,
		darkTheme: true,
		// autoHideMenuBar: true, // ! uncomment in production
		webPreferences: {
			preload: path.resolve(path.join(__dirname, 'preloads/tellerView.preload.js'))
		}
	});

	win.loadFile('./src/views/tellerView/index.html');


	/** 
	* catch data from requestClient and send it to tellerView 
	* 
	*/
	ipcMain.on('apllyClient', (event, data) => {
		win.webContents.send('replyClient', data);
		event.sender.close();
	});

};


/**
 *
 * requestClient -> deploys on click on 'buscar' button in address
 *
 * this window is used to make query's to mysql and obtain data of one client
 *
 */
const requestClient = () => {
	const win = new BrowserWindow({
		maximizable: true,
		width: 750,
		height: 500,
		darkTheme: true,
		// autoHideMenuBar: true,  // ! uncoment in production enviroment
		webPreferences: {
			preload: path.resolve(path.join(__dirname, 'preloads/requestClient.preload.js'))
		}
	});

	win.loadFile(path.join(__dirname, '/views/requestClient/index.html'));
};



/**
 * !    WARNING AREA
 * 
 * * events section, please becareful
 * * here area events of each window
 * * the corresponsive window is declared on documentation
 *
 */


/**
	 * 'printTime' -> is an event to use a thermal printer for tickets
	 *
	 * @param dataPrint {Object} -> is a object with all products and data to print
	 */
ipcMain.on('printTime', (event, dataPrint) => {
	const dataToPrint = JSON.parse(dataPrint);

	// PosPrinter.print(dataToPrint, {
	// 	printerName: 'EC-PRINTER',
	// 	silent: true,
	// 	preview: false,
	// 	margin: '0 0 0 0',
	// 	copies: 1,
	// 	timeOutPerLine: 1000,
	// }).catch(error => console.log(error));
});


/** 
 * simple open's the pop up
 */
ipcMain.on('openClients', () => {
	requestClient();
});

/**
 * 
 * @param tel {string} is the celphone number of user to search in DB
 * 
 */
ipcMain.handle('getClient',  (event, tel) => {
	const sql = `SELECT * FROM clientes WHERE telefono='${tel}'`;
	const response = makeQuery(sql);

	return response;
});

/**
 * 
 * @param data {Object} -> contains all data of user like name, phone and direction
 * 
 * create a new client in database
 * 
 */
ipcMain.handle('newClient', async (event, data) => {
	const sql = `INSERT INTO clientes (nombre, telefono, direccion) VALUES ('${data['name']}','${data['phone']}','${data['direction']}')`;
	makeQuery(sql).then(r => console.log(r)).catch(err => {
		alert('Ocurrio un error al guardar el cliente..', r);
	});
});


// save and order
ipcMain.on('saveOrder',  (event, orderData) => {
	let orderProducts = '';

	orderData.orders.forEach((row) => {
		const prodName = row[0];
		const prodCount = row[2];

		orderProducts += `${prodCount}-${prodName}, `;
	});

	const productsString = orderProducts.slice(0, -2);
	const cost = orderData.cost.replace('$', '');
	const address = orderData.address === '' ? 'local' : orderData.address;

	const sql = `INSERT INTO orders (date, time, products, address, cost, pay_method) VALUES (NOW(), NOW(), '${productsString}','${address}','${cost}', '${orderData.payMethod}')`;

	makeQuery(sql).then(r => console.log(res)).catch(err => {
		alert("Ocurrio un error guardando la orden..");
	});
});

ipcMain.handle('getOrders', async (event, filters) => {

	const dayFilter = {
		from: filters.date.from || null,
		to: filters.date.to || null
	};

	const costs = {
		min: filters.cost.min || null,
		max: filters.cost.max || null
	};

	const addressFil = filters.address;

	let conditions = '';

	if (dayFilter.from !== null){
		conditions += `orders.date >= date('${dayFilter.from}') AND orders.date <= date('${dayFilter.to}') AND `;
	}else {
		const actualDate = getActualDate(false).split('-');
		const formatForDb = `${actualDate[0]}-${actualDate[2]}-${actualDate[1]}`;

		conditions += `orders.date = date('${formatForDb}') AND `;
	}

	// TODO write all future conditions here

	if (addressFil !== null){
		conditions += `orders.address LIKE '%${addressFil}%' AND `;
	}

	if (costs.min !== null || costs.max !== null){
		if (costs.min !== null && costs.max !== null){
			const min = costs.min.replace('$', '');
			const max = costs.max.replace('$', '');
			conditions += `orders.cost >= '${min}' AND orders.cost <= '${max}' AND `;
		} 
		else if (costs.min !== null){
			const min = costs.min.replace('$', '');
			conditions += `orders.cost >= '${min}' AND `;
		}
		else if (costs.max !== null){
			const max = costs.max.replace('$', '');
			conditions += `orders.cost <= '${max}' AND `;
		}
	}

	// slicing the las 'AND' from the string for no Sql Error Syntax
	if (conditions !== ''){
		conditions = conditions.slice(0, -4);
	}

	const sql = `SELECT * FROM orders WHERE ${conditions}`;
	const res = makeQuery(sql);

	return res;
});

ipcMain.handle('modOrder', async (event, orderData) => {
	const sql = `UPDATE orders SET time='${orderData.hour}', products='${orderData.products}', address='${orderData.address}', cost='${orderData.cost}', pay_method='${orderData.payMethod}' WHERE id='${orderData.id}'`;
	return makeQuery(sql);
});

ipcMain.handle('delOrder', async (event, orderId) => {
	const sql = `DELETE FROM orders WHERE id='${orderId}'`;
	return makeQuery(sql);
});

ipcMain.handle('checkPassword', async (event, password) => {
	return true;
	// bcrypt.compareSync(password, '$2a$10$mnq2oKZJltF6myMlvPw0H.W/4tSlW4sll1BFpZZ0eCN79tTnkGoSe');
});


ipcMain.handle('getProducts', () => {
	return makeQuery('SELECT * FROM products');
});

ipcMain.handle('getProductsAndCategory', () => {
	return makeQuery('SELECT p.id, p.name, p.price, p.disposable, pt.name AS product_type FROM products p INNER JOIN products_types pt ON p.product_type = pt.id ORDER BY p.id;');
});

ipcMain.on('deleteProduct',  async (ev, id) => {
	 try {
		  await conn.execute('DELETE FROM products WHERE id = ?', [id]);
	    return true;
	 }
	 catch (ex){
		 return false;
	 }
});

ipcMain.handle('getCategories', () => {
	return makeQuery('SELECT * FROM products_types');
});

/**
 * mejor sacarlos desde la db
 */
ipcMain.handle('getProductsStats', async () => {
	const query = `SELECT products FROM orders WHERE date=date('${formatForDb}')`;
	const res = await makeQuery(query);

	const clearStats = {

	};

	res.forEach((prdCollection) => {

		const rawStats = prdCollection.products.replace(' ', '').split(',');
		
		rawStats.forEach((rawStat) => {
			const clearStat = rawStat.split('-');

			const numItems = clearStat[0];
			const name = clearStat[1];

			if (!clearStats[name])
				clearStats[name] = {
					selled: 0,
					toGo: 0,
					eatHere: 0
				};

			// TODO in the future add here count of eatHere and toGo
			clearStats[name]['selled'] += parseInt(numItems);
		});

	});

	return clearStats;
});


ipcMain.handle('saveProduct', (ev, productInfo) => {
	console.log(productInfo);
	
	let sql = '';
	
	if (productInfo.crudMode === 1) {
		sql = `INSERT INTO products (name, price, disposable, product_type) VALUES ('${productInfo.name}', ${productInfo.price}, ${productInfo.disposable}, ${productInfo.productType});`;
	}
	else if (productInfo.crudMode === 2) {
		sql = `UPDATE products SET name='${productInfo.name}', price=${productInfo.price}, disposable=${productInfo.disposable}, product_type=${productInfo.productType} WHERE id=${productInfo.id};`;
	}
	
	return makeQuery(sql);
});


app.allowRendererProcessReuse = false;

// this protocol permits ous to use local images in the renderer process
// in path to localImage in the render process, use productsimages://imageName.extension
app.on('ready', () => {

	AppDirs.checkAppDirs();

	protocol.registerFileProtocol('productsimages', (request, callback) => {
		const url = request.url.replace('productsimages://', '');
		const filePath = path.join(AppDirs.productsImages, url); // Suponiendo que las imágenes están en el mismo directorio que tu script principal
		callback({ path: filePath });
	});

});

app.on('quit', async () => {
	await conn.end();
})

app.whenReady().then(() => {
	tellerView();
});
