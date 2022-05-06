/*
Project Name: ESXBrasil Launcher (esxbrasil.website)
Language Used: NodeJS
Developer/s: Renildo Marcio (renildomrc@gmail.com)
All Reserve Rights ESXBrasil 2015 - 2022
*/

const {app, BrowserWindow, dialog, shell, clipboard, Menu, Tray} = require("electron")
const {download} = require("electron-dl")
const {autoUpdater} = require('electron-updater')
const log = require('electron-log')
const isUserDeveloper = require('electron-is-dev')
const path = require('path')
const exec = require('child_process').exec
var ipc = require('electron').ipcMain
var fs = require('fs')
var ps = require('ps-node')
var process = require('process')

let mainWindow = null
var disableAutoDetectionFiveM = false

let timerInterval

const checkInternetConnected = require('check-internet-connected');
checkInternetConnected()
    .then((result) => {
        console.log(result);//successfully connected to a server
        log.info("internet online.")
    })
    .catch((ex) => {
        console.log(ex); // cannot connect to a server or error occurred.
        log.info("internet off.")
        if (process.platform !== 'darwin') {
            app.quit()
        }
        });;
const config = {
    timeout: 5000, //timeout connecting to each server, each try
    retries: 5,//number of retries to do before failing
    domain: 'https://www.google.com',//the domain to check DNS record of
}
checkInternetConnected(config);

const gotTheLock = app.requestSingleInstanceLock()

const isRunning = (query, cb) => {
    let platform = process.platform;
    let cmd = '';
    switch (platform) {
        case 'win32' : cmd = `tasklist`; break;
        case 'darwin' : cmd = `ps -ax | grep ${query}`; break;
        case 'linux' : cmd = `ps -A`; break;
        default: break;
    }
    exec(cmd, (err, stdout, stderr) => {
        cb(stdout.toLowerCase().indexOf(query.toLowerCase()) > -1);
    });
}

if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', () => {
		if (mainWindow) {
            mainWindow.restore()
            mainWindow.show()
            mainWindow.focus()
		}
	})
}

function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex
    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex -= 1
      temporaryValue = array[currentIndex]
      array[currentIndex] = array[randomIndex]
      array[randomIndex] = temporaryValue
    }
    return array
}


function preRequirementsCheck() {
    log.info("Checking system requirements.")
    isRunning('FiveM.exe', (status) => {
        if (status == true) {
            mainWindow.webContents.executeJavaScript(`Swal.fire({
                title: 'Play Failed',
                html: 'Por favor, feche o FiveM.',
                icon: 'error'
            });`)
        } else {
            initiateConnection()
        }
    })
}
ipc.on('preRequirementsCheck', preRequirementsCheck)

//Connect
function initiateConnection() {
    clientConnect()
    setTimeout(function() {
        isFiveMStillRunning()
    }, 30000)
}

function clientConnect() {
    shell.openExternal("fivem://connect/255562")
    mainWindow.hide()
    mainWindow.webContents.executeJavaScript('destroyEverything();')

}

ipc.on('changeDetection', function() {
    log.log("Chaning detection rule.")
    if (disableAutoDetectionFiveM) {
        disableAutoDetectionFiveM = false
        mainWindow.webContents.executeJavaScript(`Swal.fire({
            title: 'FiveM',
            html: 'Alterado detecção de FiveM para falso.'
        });`)
    } else {
        disableAutoDetectionFiveM = true
        mainWindow.webContents.executeJavaScript(`Swal.fire({
            title: 'FiveM',
            html: 'Alterado a detecção de FiveM para verdadeiro.'
        });`)
    }
})

function isFiveMStillRunning () {
    if (disableAutoDetectionFiveM == false) {
        isRunning('FiveM.exe', (status) => {
            if (status != true) {
                log.log("Shutting all the local proxies servers")
                mainWindow.webContents.executeJavaScript(`reEnableEverything();`)
                mainWindow.show()
                mainWindow.webContents.executeJavaScript(`player.playVideo();`)
            } else {
                setTimeout(function() {
                    isFiveMStillRunning()
                }, 5000)
            }
        })
    }
}
//End Connect

function startBootstrapApp () {
    log.info('Bootstraping app with process id ' + process.pid)
    if (isUserDeveloper) {
        log.info('App is running in development')
    } else {
        log.info('App is running in production')
    }

    mainWindow = new BrowserWindow({
		width: 1280,
		height: 720,
		titleBarStyle: 'hiddenInset',
        icon: path.join(__dirname, 'assets/gui/nui/assets/img/Logo.png'),
		show: false,
		frame: false,
		devTools: false,
		webPreferences: {
            nodeIntegration: true
		}
    })

    mainWindow.webContents.on("devtools-opened", () => {
        if (!isUserDeveloper) {
            mainWindow.webContents.closeDevTools();
        }
    })

    mainWindow.webContents.on('new-window', function(e, url){
        log.info('Prevented to open other links, opening it on external.');
        e.preventDefault()
        shell.openExternal(url)
    })

    mainWindow.webContents.on("closed", () => {
        app.quit()
    })

    mainWindow.loadFile('assets/gui/launcher.html', {userAgent: 'ESXBrasil Launcher'})

    mainWindow.webContents.once('dom-ready', () => {
        log.info('Bootstrap window is ready.')
        mainWindow.show()
        autoUpdater.checkForUpdates()
    })

    appTray = new Tray(__dirname + '/assets/generated/icons/win/icon.ico');
    appTray.setToolTip("ESXBrasilRP")
    const contextMenu = Menu.buildFromTemplate([
        { label: 'ESXBrasilRP v' + app.getVersion() },
        { type: 'separator' },
        { label: 'Discord', click() { shell.openExternal('https://discord.gg/h269JAMTFy'); } },
        { type: 'separator' },
        { label: 'Atualização', click() { autoUpdater.checkForUpdates() } },
        { type: 'separator' },
        { label: 'Sair do Launcher', click() { app.quit() } },
    ])
    appTray.setContextMenu(contextMenu)
    mainWindow.webContents.once('dom-ready', () => {
        log.info('Bootstrap window is ready.')
        mainWindow.show()
        autoUpdater.checkForUpdates()
        appTray.on('click', () => {
            mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
        })
    })
    
}

ipc.on('checkUpdate', function() {
    log.log("Triggering auto update tool")
    autoUpdater.checkForUpdatesAndNotify()
    autoUpdater.checkForUpdates()
})

ipc.on('regras', function () {
    log.log("Pagina Sobre")
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'Pagina em manutenção!',
        text: 'Volte mais tarde!',
        imageUrl: 'https://www.manutencaoemfoco.com.br/wp-content/uploads/2015/10/Manutencao-adequada-750x300.jpg',
        imageWidth: 400,
        imageHeight: 200,
        imageAlt: 'manutenção',
        background: '#000',
        color: '#fff',
    })`)
})

ipc.on('loja', function () {
    log.log("Pagina loja")
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'Pagina em manutenção!',
        text: 'Volte mais tarde!',
        imageUrl: 'https://www.manutencaoemfoco.com.br/wp-content/uploads/2015/10/Manutencao-adequada-750x300.jpg',
        imageWidth: 400,
        imageHeight: 200,
        imageAlt: 'manutenção',
        background: '#000',
        color: '#fff',
    })`)
})

ipc.on('estatiscas', function () {
    log.log("Pagina estatiscas")
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'Pagina em manutenção!',
        text: 'Volte mais tarde!',
        imageUrl: 'https://www.manutencaoemfoco.com.br/wp-content/uploads/2015/10/Manutencao-adequada-750x300.jpg',
        imageWidth: 400,
        imageHeight: 200,
        imageAlt: 'manutenção',
        background: '#000',
        color: '#fff',
    })`)
})

ipc.on('fotos', function () {
    log.log("Pagina fotos")
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'Pagina em manutenção!',
        text: 'Volte mais tarde!',
        imageUrl: 'https://www.manutencaoemfoco.com.br/wp-content/uploads/2015/10/Manutencao-adequada-750x300.jpg',
        imageWidth: 400,
        imageHeight: 200,
        imageAlt: 'manutenção',
        background: '#000',
        color: '#fff',
    })`)
})

ipc.on('forum', function () {
    log.log("Pagina forum")
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'Pagina em manutenção!',
        text: 'Volte mais tarde!',
        imageUrl: 'https://www.manutencaoemfoco.com.br/wp-content/uploads/2015/10/Manutencao-adequada-750x300.jpg',
        imageWidth: 400,
        imageHeight: 200,
        imageAlt: 'manutenção',
        background: '#000',
        color: '#fff',
    })`)
})

app.on('open-url', function (event, data) {
	event.preventDefault()
    mainWindow.focus()
})

app.on('window-all-closed', () => {
    if (process. platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});

log.info('Code Encoded.')
app.on('ready', startBootstrapApp)
app.setAsDefaultProtocolClient('esxbrasil')

autoUpdater.on('checking-for-update', () => {
    log.log("Checking for updates.")
})

autoUpdater.on('update-available', info => {
    log.log("Update available.")
})

autoUpdater.on('download-progress', progressObj => {
    log.log(`Downloading update. DL: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`)
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'Baixando atualização',
        html: 'Speed: ${progressObj.bytesPerSecond} - ${~~progressObj.percent}% [${progressObj.transferred}/${progressObj.total}',
        allowOutsideClick: false,
        onBeforeOpen: () => {
            Swal.showLoading();
        }
    });`)
})

autoUpdater.on('error', err => {
    log.log(`Update check failed: ${err.toString()}`)
})

autoUpdater.on('update-not-available', info => {
    log.log("Update not available.")
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'Atualizações',
        html: 'Não há atualizações disponíveis.',
        icon: 'error'
    });`)
})

autoUpdater.on('update-downloaded', info => {
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'Reiniciando o aplicativo',
        html: 'Aguente firme, reiniciando o aplicativo para atualização!',
        allowOutsideClick: false,
        onBeforeOpen: () => {
            Swal.showLoading();
        }
    });`)
    autoUpdater.quitAndInstall();
})

// System Discord Dev

// DiscordModules
const client = require('discord-rich-presence')('798575083424972871')

let startTimestamp = new Date();

// discordClient
client.on('connected', () => {

    details = 'Entrando no servidor...';

    setInterval(() => {
        client.updatePresence({
            details: details,
            startTimestamp,
            largeImageKey: 'asdasdg',
            largeImageText: 'Launcher ESXBrasil',
            state: 'Server ESXBrasilRP',
            instance: true,
            buttons: [
                { "label": "Discord", "url": "https://discord.gg/h269JAMTFy" },
                { "label": "Download Launcher", "url": "https://github.com/psycodeliccircus/esxbrasillauncher/releases" }
            ]
        });
    }, 15e3);

});