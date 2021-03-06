/*
Project Name: ESXBrasil Launcher (esxbrasil.website)
Language Used: NodeJS
Developer/s: Renildo Marcio (renildomrc@gmail.com)
All Reserve Rights ESXBrasil 2015 - 2022
*/

const { app, BrowserWindow, nativeTheme, ipcMain, dialog, shell, clipboard, Menu, Tray, Notification} = require("electron")
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
const RightMenuapp = require('./right-menu-config')

let mainWindow = null
var disableAutoDetectionFiveM = false

let rightMenu = Menu.buildFromTemplate(RightMenuapp)

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
        mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'Sem conexão!',
        text: 'Você esta sem internet!',
        imageAlt: 'Sem conexão',
        background: '#000',
        color: '#fff',
        })`)
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

    //Load Right click menu
    mainWindow.webContents.on('context-menu', e => {
        rightMenu.popup(mainWindow)
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
    const nativeImage = require('electron').nativeImage
    const contextMenu = Menu.buildFromTemplate([
        { 
            label: 'ESXBrasilRP v' + app.getVersion(),
            icon: nativeImage.createFromPath(__dirname + '/assets/generated/icons/png/16x16.png').resize({ width: 16 }) 
        },
        { type: 'separator' },
        { 
            label: 'Sobre',
            icon: nativeImage.createFromPath(__dirname + '/assets/generated/icons/png/sobre.png').resize({ width: 16 }),  
            click() { sobre() } 
        },
        { type: 'separator' },
        { 
            label: 'Discord',
            icon: nativeImage.createFromPath(__dirname + '/assets/generated/icons/png/discord.png').resize({ width: 16 }), 
            click() { shell.openExternal('https://discord.gg/h269JAMTFy'); } 
        },
        { type: 'separator' },
        { 
            label: 'Atualização',
            icon: nativeImage.createFromPath(__dirname + '/assets/generated/icons/png/update.png').resize({ width: 16 }), 
            click() { autoUpdater.checkForUpdates() } 
        },
        { type: 'separator' },
        { 
            label: 'Sair do Launcher',
            icon: nativeImage.createFromPath(__dirname + '/assets/generated/icons/png/quit.png').resize({ width: 16 }), 
            click() { app.quit() } 
        },
    ])
    appTray.setContextMenu(contextMenu)
    mainWindow.webContents.once('dom-ready', () => {
        log.info('Bootstrap window is ready.')
        mainWindow.show()
        autoUpdater.checkForUpdates()
        setActivity()
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


function sobre() {
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'Sobre a ESXBrasil!',
        text: 'Samos uma equipe de programadores focados em melhora o RolePlay e muito mais!',
        imageUrl: 'https://esxbrasilrp.github.io/thumbnail_default.png',
        imageWidth: 400,
        imageHeight: 200,
        imageAlt: 'Sobre a ESXBrasil!',
    })`)
}

ipc.on('sobre', function () {
    log.log("Pagina sobre")
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'Sobre a ESXBrasil!',
        text: 'Samos uma equipe de programadores focados em melhora o RolePlay e muito mais!',
        imageUrl: 'https://esxbrasilrp.github.io/thumbnail_default.png',
        imageWidth: 400,
        imageHeight: 200,
        imageAlt: 'Sobre a ESXBrasil!',
    })`)
})

ipc.on('regras', function () {
    log.log("Pagina Regras")
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

function setActivity() {

    const client = require('discord-rich-presence')('948418030235443222')
    client.on("error", _ => true);// Ignore error: They happen only when the discord client is not installed

    // discordClient
    client.on('connected', () => {
        console.log("Launcher ESXBrasil!");
        startTimestamp = new Date();
        client.updatePresence({
            state: "Launcher ESXBrasil",
            startTimestamp,
            largeImageKey: "logo",
            instance: true,
            buttons: [
                { "label": "Website", "url": "https://esxbrasil.website" },
                { "label": "Forum", "url": "https://forum.esxbrasil.website" }
            ]
        });

        setInterval(() => {
            console.log("Server ESXBrasil!");
            client.updatePresence({
                state: "Server ESXBrasil",
                startTimestamp,
                largeImageKey: 'logo',
                largeImageText: "ESXBrasil",
                smallImageKey: 'online',
                smallImageText: "Servidor online!",
                instance: true,
                buttons: [
                    { "label": "Discord", "url": "https://discord.gg/h269JAMTFy" },
                    { "label": "Download Launcher", "url": "https://github.com/psycodeliccircus/esxbrasillauncher/releases" }
                ]
            });
        }, 35500);
    });
}


// final System Discord Dev