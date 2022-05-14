/*
Project Name: ESXBrasil Launcher (esxbrasil.website)
Language Used: NodeJS
Developer/s: Renildo Marcio (renildomrc@gmail.com)
All Reserve Rights ESXBrasil 2015 - 2022
*/

const {app, ipcMain, shell} = require("electron")

module.exports = [
    {
        label: 'ESXBrasil v' + app.getVersion(),
        submenu: [
            { label: 'Sobre', click() { sobre() } },
            { label: 'Forums', click() { forum() } },
            { label: 'Fotos', click() { fotos() } },
            { label: 'Estatiscas', click() { estatiscas() } },
            { label: 'Loja', click() { loja() } },
            { label: 'Regras', click() { regras() } },
            { label: 'Atualizações', click() { checkUpdate() } },
        ]
    },
    {
        label: 'Redes Sociais',
        submenu: [
            { label: 'YouTube', click() { shell.openExternal('https://youtube.com/renildomarcio'); } },
            { label: 'TikTok', click() { shell.openExternal('https://www.tiktok.com/@renildomarcio'); } },
            { label: 'Twitter', click() { shell.openExternal('https://twitter.com/renildomarcio'); } },
            { label: 'FaceBook', click() { shell.openExternal('https://facebook.com/esxbrasil'); } },
        ]
    },
    { label: 'Sair', click() { app.quit() } },
]

function sobre() {
    ipcMain.emit('sobre')
}
function forum() {
    ipcMain.emit('forum')
}
function fotos() {
    ipcMain.emit('fotos')
}
function estatiscas() {
    ipcMain.emit('estatiscas')
}
function loja() {
    ipcMain.emit('loja')
}
function regras() {
    ipcMain.emit('regras')
}
function checkUpdate() {
    ipcMain.emit('checkUpdate')
}