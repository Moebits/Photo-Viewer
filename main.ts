import {app, BrowserWindow, dialog, globalShortcut, ipcMain, session, shell} from "electron"
import {autoUpdater} from "electron-updater"
import Store from "electron-store"
import * as localShortcut from "electron-shortcuts"
import path from "path"
import process from "process"
import functions from "./structures/functions"
import "./dev-app-update.yml"
import pack from "./package.json"
import sharp from "sharp"
import fs from "fs"

require("@electron/remote/main").initialize()
process.setMaxListeners(0)
let window: Electron.BrowserWindow | null
let currentDialog: Electron.BrowserWindow | null
autoUpdater.autoDownload = false
const store = new Store()
let filePath = ""

let originalImages = null as any
let originalName = null as any
let originalLink = null as any
let historyStates = [] as string[]
let historyIndex = -1

ipcMain.handle("debug", console.log)

const updateHistoryState = (state: any) => {
  historyIndex++
  historyStates.splice(historyIndex, Infinity, state)
}

const getGIFOptions = () => {
  return store.get("gifOptions", {
    transparency: false,
    transparentColor: "#000000",
  }) as {transparency: boolean, transparentColor: string}
}

const saveImage = (image: any, savePath: string) => {
  if (image.startsWith("file:///")) image = image.replace("file:///", "")
  if (path.extname(savePath) === ".gif") {
    functions.downloadImage(image, savePath)
  } else {
    if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
    sharp(image).toFile(savePath)
  }
}

const getDimensions = async (image: any) => {
  const metadata = await sharp(image).metadata()
  return {width: metadata.width ?? 0, height: metadata.height ?? 0}
}

ipcMain.handle("close-current-dialog", () => {
  currentDialog?.close()
})

ipcMain.handle("resize-window", async (event, image: string) => {
  const dim = await getDimensions(image)
  const {width, height} = functions.constrainDimensions(dim.width, dim.height)
  // window?.setSize(width, height, true)
})


ipcMain.handle("save-image", async (event, image: any, savePath: string) => {
  saveImage(image, savePath)
  shell.showItemInFolder(path.normalize(savePath))
})

ipcMain.handle("bulk-save-directory", async (event: any) => {
  if (!window) return
  let images = historyStates[historyIndex] as any
  if (!images) return null
  const save = await dialog.showSaveDialog(window, {
    defaultPath: originalImages[0],
    filters: [
      {name: "All Files", extensions: ["*"]},
      {name: "PNG", extensions: ["png"]},
      {name: "JPG", extensions: ["jpg"]},
      {name: "GIF", extensions: ["gif"]},
      {name: "WEBP", extensions: ["webp"]},
      {name: "TIFF", extensions: ["tiff"]}
    ],
    properties: ["createDirectory"]
  })
  if (!save.filePath) return
  for (let i = 0; i < images.length; i++) {
    let name = path.basename(originalImages[i], path.extname(originalImages[i]))
    if (path.extname(save.filePath)) {
      name += path.extname(save.filePath)
    } else {
      name += path.extname(originalImages[i]) ? path.extname(originalImages[i]) : ".png"
    }
    saveImage(images[i], `${path.dirname(save.filePath)}/${name}`)
  }
  shell.openPath(path.dirname(save.filePath))
})

ipcMain.handle("bulk-save-overwrite", (event: any) => {
  let images = historyStates[historyIndex] as any
  if (!images) return null
  for (let i = 0; i < images.length; i++) {
    saveImage(images[i], originalImages[i])
  }
  shell.openPath(path.dirname(originalImages[0]))
})

ipcMain.handle("show-bulk-save-dialog", (event: any) => {
  window?.webContents.send("close-all-dialogs", "bulk-save")
  window?.webContents.send("show-bulk-save-dialog")
})

ipcMain.handle("bulk-process", () => {
  window?.webContents.send("bulk-process")
})

ipcMain.handle("reset-bounds", () => {
  window?.webContents.send("reset-bounds")
})

ipcMain.handle("get-info", (event: any, image: string) => {
  window?.webContents.send("close-all-dialogs", "info")
  window?.webContents.send("show-info-dialog", image)
})

ipcMain.handle("get-width-height", async (event, image: any) => {
  return getDimensions(image)
})

ipcMain.handle("get-gif-options", () => {
  return getGIFOptions()
})

ipcMain.handle("set-gif-options", (event: any, state: any) => {
  let {transparency, transparentColor} = state
  store.set("gifOptions", {transparency, transparentColor})
})

ipcMain.handle("gif-effects", async (event: any, state: any) => {
  let {speed, reverse, transparency, transparentColor} = state
  let images = historyStates[historyIndex] as any
  if (!images) return null
  let imgArray = [] as any[]
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    if (image.startsWith("file:///")) image = image.replace("file:///", "")
    if (image.startsWith("http")) image = await functions.linkToBase64(image)
    if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
    const metadata = await sharp(image).metadata()
    if (metadata.format === "gif") {
      const {frameArray, delayArray} = await functions.getGIFFrames(image, {speed: Number(speed), reverse})
      const newFrameArray = [] as Buffer[]
      for (let i = 0; i < frameArray.length; i++) {
        const newFrame = await sharp(frameArray[i]).toBuffer()
        newFrameArray.push(newFrame)
      }
      let transColor = transparency ? transparentColor : undefined
      const buffer = await functions.encodeGIF(newFrameArray, delayArray, metadata.width!, metadata.height!, {transparentColor: transColor})
      const base64 = functions.bufferToBase64(buffer, "gif")
      imgArray.push(base64)
    }
  }
  updateHistoryState(imgArray)
  window?.webContents.send("update-images", imgArray)
  store.set("gifOptions", {transparency, transparentColor})
  
})

ipcMain.handle("show-gif-dialog", async (event) => {
  if (currentDialog) {
    currentDialog.close()
    revertToLastState()
    // @ts-expect-error
    if (currentDialog.type === "gif") return
  }
  const bounds = window?.getBounds()!
  currentDialog = new BrowserWindow({width: 190, height: 175, x: bounds.x + bounds.width - 190 - 170, y: bounds.y + 60, resizable: false, show: false, frame: false, backgroundColor: "#3177f5", webPreferences: {nodeIntegration: true, contextIsolation: false, webSecurity: false}})
  currentDialog.loadFile(path.join(__dirname, "gifdialog.html"))
  currentDialog.removeMenu()
  currentDialog.setAlwaysOnTop(true)
  require("@electron/remote/main").enable(currentDialog.webContents)
  currentDialog.on("ready-to-show", () => {
    currentDialog?.show()
    window?.focus()
  })
  currentDialog.on("closed", () => {
    currentDialog = null
  })
  // @ts-expect-error
  currentDialog.type = "gif"
})

ipcMain.handle("get-original-link", async () => {
  return originalLink
})

ipcMain.handle("set-original-link", async (event, link: any) => {
  originalLink = link
})

ipcMain.handle("get-original-name", async () => {
  return originalName
})

ipcMain.handle("set-original-name", async (event, name: any) => {
  originalName = name
})

ipcMain.handle("tiff-to-png", async (event, file: string) => {
  if (file.startsWith("file:///")) file = file.replace("file:///", "")
  const buffer = await sharp(file).png().toBuffer()
  return functions.bufferToBase64(buffer, "png")
})

ipcMain.handle("escape-pressed", () => {
  window?.webContents.send("escape-pressed")
  currentDialog?.webContents.send("escape-pressed")
})

ipcMain.handle("enter-pressed", () => {
  window?.webContents.send("enter-pressed")
  currentDialog?.webContents.send("enter-pressed")
})

ipcMain.handle("accept-action-response", (event: any, action: string, response: "accept" | "cancel") => {
  window?.webContents.send("accept-action-response", action, response)
})

ipcMain.handle("clear-accept-action", (event: any) => {
  window?.webContents.send("clear-accept-action")
})

ipcMain.handle("trigger-accept-action", (event: any, action: string) => {
  window?.webContents.send("trigger-accept-action", action)
})

const getMetadata = async (images: any, toBuffer?: boolean) => {
  if (!images) return null
  let metaArray = [] as any[]
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    let dataURL = false
    if (image.startsWith("file:///")) image = image.replace("file:///", "")
    if (image.startsWith("http")) {
      image = await functions.linkToBase64(image)
    } else {
      if (image.startsWith("data:")) {
        image = functions.base64ToBuffer(image)
        dataURL = true
      }
    }
    let metadata = await sharp(image).metadata()
    if (metadata.format !== "gif" && toBuffer) {
      metadata = await sharp(await sharp(image).toBuffer()).metadata()
    }
    let name = null
    if (dataURL) {
      name = path.basename(originalImages[i]).startsWith("data:") ? "Image" : path.basename(originalImages[i], path.extname(originalImages[i]))
    } else {
      name = path.basename(images[i], path.extname(images[i]))
    }
    const width = metadata.width ? metadata.width : "?"
    const height = metadata.height ? metadata.height : "?"
    const dpi = metadata.density ? metadata.density : "?"
    let size = metadata.size as any
    if (!size) {
      try {
        size = fs.statSync(image).size
      } catch {
        size = "?"
      }
    }
    const frames = metadata.pages ? metadata.pages : 1
    const format = metadata.format ? metadata.format : "?"
    const space = metadata.space ? metadata.space : "?"
    metaArray.push({image: images[i], name, width, height, size, format, dpi, frames, space})
  }
  return metaArray
}

ipcMain.handle("get-original-metadata", async () => {
  return getMetadata(originalImages, true)
})

ipcMain.handle("get-metadata", async () => {
  let images = historyStates[historyIndex] as any
  return getMetadata(images)
})

ipcMain.handle("crop", async (event, state: any) => {
  let {x, y, width, height, realTime} = state
  x = functions.clamp(x, 0, 100)
  y = functions.clamp(y, 0, 100)
  width = functions.clamp(width, 0, 100)
  height = functions.clamp(height, 0, 100)
  if (width === 0 || height === 0) return null
  let images = historyStates[historyIndex] as any
  if (!images) return null
  let imgArray = [] as any[]
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    if (image.startsWith("file:///")) image = image.replace("file:///", "")
    if (image.startsWith("http")) image = await functions.linkToBase64(image)
    if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
    const metadata = await sharp(image).metadata()
    const cropX = Math.round(metadata.width! / 100 * x)
    const cropY = Math.round(metadata.height! / 100 * y)
    const cropWidth = Math.round(metadata.width! / 100 * width)
    const cropHeight = Math.round(metadata.height! / 100 * height)
    let buffer = null as any
    if (metadata.format === "gif") {
      const gifOptions = getGIFOptions()
      const {frameArray, delayArray} = await functions.getGIFFrames(image)
      const newFrameArray = [] as Buffer[]
      for (let i = 0; i < frameArray.length; i++) {
        const newFrame = await sharp(frameArray[i])
          .extract({left: cropX, top: cropY, width: cropWidth, height: cropHeight})
          .toBuffer()
        newFrameArray.push(newFrame)
      }
      const transparentColor = gifOptions.transparency ? gifOptions.transparentColor : undefined
      buffer = await functions.encodeGIF(newFrameArray, delayArray, cropWidth, cropHeight, {transparentColor})
    } else {
      buffer = await sharp(image)
        .extract({left: cropX, top: cropY, width: cropWidth, height: cropHeight})
        .toBuffer()
    }
    const base64 = functions.bufferToBase64(buffer, metadata.format ?? "png")
    imgArray.push(base64)
  }
  if (realTime) {
    window?.webContents.send("update-images", imgArray) 
    return null
  }
  updateHistoryState(imgArray)
  return imgArray
})

ipcMain.handle("apply-crop", async (event, state: any) => {
  window?.webContents.send("apply-crop", state)
})

ipcMain.handle("show-crop-dialog", async (event) => {
  if (currentDialog) {
    currentDialog.close()
    revertToLastState()
    // @ts-expect-error
    if (currentDialog.type === "crop") return
  }
  const bounds = window?.getBounds()!
  currentDialog = new BrowserWindow({width: 190, height: 220, x: bounds.x + 70, y: bounds.y + 400, resizable: false, show: false, frame: false, backgroundColor: "#3177f5", webPreferences: {nodeIntegration: true, contextIsolation: false, webSecurity: false}})
  currentDialog.loadFile(path.join(__dirname, "cropdialog.html"))
  currentDialog.removeMenu()
  currentDialog.setAlwaysOnTop(true)
  require("@electron/remote/main").enable(currentDialog.webContents)
  currentDialog.on("ready-to-show", () => {
    currentDialog?.show()
    window?.focus()
  })
  currentDialog.on("closed", () => {
    currentDialog = null
  })
  // @ts-expect-error
  currentDialog.type = "crop"
})

ipcMain.handle("rotate", async (event, state: any) => {
  const {degrees, realTime} = state
  let images = historyStates[historyIndex] as any
  if (!images) return null
  let imgArray = [] as any[]
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    if (image.startsWith("file:///")) image = image.replace("file:///", "")
    if (image.startsWith("http")) image = await functions.linkToBase64(image)
    if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
    const metadata = await sharp(image).metadata()
    let buffer = null as any
    if (metadata.format === "gif") {
      if (realTime) return null
      const gifOptions = getGIFOptions()
      const {frameArray, delayArray} = await functions.getGIFFrames(image)
      const newFrameArray = [] as Buffer[]
      for (let i = 0; i < frameArray.length; i++) {
        const newFrame = await sharp(frameArray[i])
        .png()
        .rotate(degrees, {background: {r: 0, b: 0, g: 0, alpha: 0}})
        .toBuffer()
        newFrameArray.push(newFrame)
      }
      const newMeta = await sharp(newFrameArray[0]).metadata()
      const transparentColor = gifOptions.transparency ? gifOptions.transparentColor : undefined
      buffer = await functions.encodeGIF(newFrameArray, delayArray, newMeta.width!, newMeta.height!, {transparentColor})
    } else {
      buffer = await sharp(image)
        .png()
        .rotate(degrees, {background: {r: 0, b: 0, g: 0, alpha: 0}})
        .toBuffer()
    }
    const base64 = functions.bufferToBase64(buffer, metadata.format ?? "png")
    imgArray.push(base64)
  }
  if (realTime) {
    window?.webContents.send("update-images", imgArray) 
    return null
  }
  updateHistoryState(imgArray)
  return imgArray
})

ipcMain.handle("apply-rotate", async (event, state: any) => {
  window?.webContents.send("apply-rotate", state)
})

ipcMain.handle("show-rotate-dialog", async (event) => {
  if (currentDialog) {
    currentDialog.close()
    revertToLastState()
    // @ts-expect-error
    if (currentDialog.type === "rotate") return
  }
  const bounds = window?.getBounds()!
  currentDialog = new BrowserWindow({width: 230, height: 170, x: bounds.x + bounds.width - 230 - 70, y: bounds.y + 60, resizable: false, show: false, frame: false, backgroundColor: "#3177f5", webPreferences: {nodeIntegration: true, contextIsolation: false, webSecurity: false}})
  currentDialog.loadFile(path.join(__dirname, "rotatedialog.html"))
  currentDialog.removeMenu()
  currentDialog.setAlwaysOnTop(true)
  require("@electron/remote/main").enable(currentDialog.webContents)
  currentDialog.on("ready-to-show", () => {
    currentDialog?.show()
    window?.focus()
  })
  currentDialog.on("closed", () => {
    currentDialog = null
  })
  // @ts-expect-error
  currentDialog.type = "rotate"
})

ipcMain.handle("resize", async (event, state: any) => {
  const {width, height, percent, realTime} = state
  if (Number.isNaN(width) || Number.isNaN(height) || !Number(width)|| !Number(height)) return null
  let images = historyStates[historyIndex] as any
  if (!images) return null
  let imgArray = [] as any[]
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    if (image.startsWith("file:///")) image = image.replace("file:///", "")
    if (image.startsWith("http")) image = await functions.linkToBase64(image)
    if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
    const metadata = await sharp(image).metadata()
    let newWidth = percent ? (metadata.width! / 100) * Number(width) : Number(width)
    let newHeight = percent ? (metadata.height! / 100) * Number(height) : Number(height)
    let buffer = null as any
    if (metadata.format === "gif") {
      if (realTime) return null
      const gifOptions = getGIFOptions()
      const {frameArray, delayArray} = await functions.getGIFFrames(image)
      const newFrameArray = [] as Buffer[]
      for (let i = 0; i < frameArray.length; i++) {
        const newFrame = await sharp(frameArray[i])
        .resize(Math.round(newWidth), Math.round(newHeight), {fit: "fill", kernel: "cubic"})
        .toBuffer()
        newFrameArray.push(newFrame)
      }
      const transparentColor = gifOptions.transparency ? gifOptions.transparentColor : undefined
      buffer = await functions.encodeGIF(newFrameArray, delayArray, Number(width), Number(height), {transparentColor})
    } else {
      buffer = await sharp(image)
        .resize(Math.round(newWidth), Math.round(newHeight), {fit: "fill", kernel: "cubic"})
        .toBuffer()
    }
    const base64 = functions.bufferToBase64(buffer, metadata.format ?? "png")
    imgArray.push(base64)
  }
  if (realTime) {
    window?.webContents.send("update-images", imgArray)
    return null
  }
  updateHistoryState(imgArray)
  return imgArray
})

ipcMain.handle("apply-resize", async (event, state: any) => {
  window?.webContents.send("apply-resize", state)
})

ipcMain.handle("show-resize-dialog", async (event) => {
  if (currentDialog) {
    currentDialog.close()
    revertToLastState()
    // @ts-expect-error
    if (currentDialog.type === "resize") return
  }
  const bounds = window?.getBounds()!
  currentDialog = new BrowserWindow({width: 230, height: 150, x: bounds.x + bounds.width - 230 - 70, y: bounds.y + 40, resizable: false, show: false, frame: false, backgroundColor: "#3177f5", webPreferences: {nodeIntegration: true, contextIsolation: false, webSecurity: false}})
  currentDialog.loadFile(path.join(__dirname, "resizedialog.html"))
  currentDialog.removeMenu()
  currentDialog.setAlwaysOnTop(true)
  require("@electron/remote/main").enable(currentDialog.webContents)
  currentDialog.on("ready-to-show", () => {
    currentDialog?.show()
    window?.focus()
  })
  currentDialog.on("closed", () => {
    currentDialog = null
  })
  // @ts-expect-error
  currentDialog.type = "resize"
})

ipcMain.handle("binarize", async (event, state: any) => {
  const {binarize, realTime} = state
  let images = historyStates[historyIndex] as any
  if (!images) return null
  let imgArray = [] as any[]
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    if (image.startsWith("file:///")) image = image.replace("file:///", "")
    if (image.startsWith("http")) image = await functions.linkToBase64(image)
    if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
    const metadata = await sharp(image).metadata()
    let buffer = null as any
    if (metadata.format === "gif") {
      if (realTime) return null
      const gifOptions = getGIFOptions()
      const {frameArray, delayArray} = await functions.getGIFFrames(image)
      const newFrameArray = [] as Buffer[]
      for (let i = 0; i < frameArray.length; i++) {
        const newFrame = await sharp(frameArray[i])
        .threshold(binarize)
        .toBuffer()
        newFrameArray.push(newFrame)
      }
      const transparentColor = gifOptions.transparency ? gifOptions.transparentColor : undefined
      buffer = await functions.encodeGIF(newFrameArray, delayArray, metadata.width!, metadata.height!, {transparentColor})
    } else {
      buffer = await sharp(image)
        .threshold(binarize)
        .toBuffer()
    }
    const base64 = functions.bufferToBase64(buffer, metadata.format ?? "png")
    imgArray.push(base64)
  }
  if (realTime) {
    window?.webContents.send("update-images", imgArray) 
    return null
  }
  updateHistoryState(imgArray)
  return imgArray
})

ipcMain.handle("apply-binarize", async (event, state: any) => {
  window?.webContents.send("apply-binarize", state)
})

ipcMain.handle("show-binarize-dialog", async (event) => {
  if (currentDialog) {
    currentDialog.close()
    revertToLastState()
    // @ts-expect-error
    if (currentDialog.type === "binarize") return
  }
  const bounds = window?.getBounds()!
  currentDialog = new BrowserWindow({width: 250, height: 130, x: bounds.x + 70, y: bounds.y + 450, resizable: false, show: false, frame: false, backgroundColor: "#3177f5", webPreferences: {nodeIntegration: true, contextIsolation: false, webSecurity: false}})
  currentDialog.loadFile(path.join(__dirname, "binarizedialog.html"))
  currentDialog.removeMenu()
  currentDialog.setAlwaysOnTop(true)
  require("@electron/remote/main").enable(currentDialog.webContents)
  currentDialog.on("ready-to-show", () => {
    currentDialog?.show()
    window?.focus()
  })
  currentDialog.on("closed", () => {
    currentDialog = null
  })
  // @ts-expect-error
  currentDialog.type = "binarize"
})

ipcMain.handle("pixelate", async (event, state: any) => {
  const {strength, realTime} = state
  let images = historyStates[historyIndex] as any
  if (!images) return null
  let imgArray = [] as any[]
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    if (image.startsWith("file:///")) image = image.replace("file:///", "")
    if (image.startsWith("http")) image = await functions.linkToBase64(image)
    if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
    const metadata = await sharp(image).metadata()
    let buffer = null as any
    if (metadata.format === "gif") {
      if (realTime) return null
      const gifOptions = getGIFOptions()
      const {frameArray, delayArray} = await functions.getGIFFrames(image)
      const newFrameArray = [] as Buffer[]
      for (let i = 0; i < frameArray.length; i++) {
        const pixelWidth = Math.floor(metadata.width! / strength)
        const pixelBuffer = await sharp(frameArray[i])
          .resize(pixelWidth, null, {kernel: sharp.kernel.nearest})
          .toBuffer()
        const newFrame = await sharp(pixelBuffer)
          .resize(metadata.width, null, {kernel: sharp.kernel.nearest})
          .toBuffer()
        newFrameArray.push(newFrame)
      }
      const transparentColor = gifOptions.transparency ? gifOptions.transparentColor : undefined
      buffer = await functions.encodeGIF(newFrameArray, delayArray, metadata.width!, metadata.height!, {transparentColor})
    } else {
      const pixelWidth = Math.floor(metadata.width! / strength)
      const pixelBuffer = await sharp(image)
        .resize(pixelWidth, null, {kernel: sharp.kernel.nearest})
        .toBuffer()
      buffer = await sharp(pixelBuffer)
        .resize(metadata.width, null, {kernel: sharp.kernel.nearest})
        .toBuffer()
    }
    const base64 = functions.bufferToBase64(buffer, metadata.format ?? "png")
    imgArray.push(base64)
  }
  if (realTime) {
    window?.webContents.send("update-images", imgArray) 
    return null
  }
  updateHistoryState(imgArray)
  return imgArray
})

ipcMain.handle("apply-pixelate", async (event, state: any) => {
  window?.webContents.send("apply-pixelate", state)
})

ipcMain.handle("show-pixelate-dialog", async (event) => {
  if (currentDialog) {
    currentDialog.close()
    revertToLastState()
    // @ts-expect-error
    if (currentDialog.type === "pixelate") return
  }
  const bounds = window?.getBounds()!
  currentDialog = new BrowserWindow({width: 250, height: 130, x: bounds.x + 70, y: bounds.y + 330, resizable: false, show: false, frame: false, backgroundColor: "#3177f5", webPreferences: {nodeIntegration: true, contextIsolation: false, webSecurity: false}})
  currentDialog.loadFile(path.join(__dirname, "pixelatedialog.html"))
  currentDialog.removeMenu()
  currentDialog.setAlwaysOnTop(true)
  require("@electron/remote/main").enable(currentDialog.webContents)
  currentDialog.on("ready-to-show", () => {
    currentDialog?.show()
    window?.focus()
  })
  currentDialog.on("closed", () => {
    currentDialog = null
  })
  // @ts-expect-error
  currentDialog.type = "pixelate"
})

ipcMain.handle("blur", async (event, state: any) => {
  const {blur, sharpen, realTime} = state
  let images = historyStates[historyIndex] as any
  if (!images) return null
  let imgArray = [] as any[]
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    if (image.startsWith("file:///")) image = image.replace("file:///", "")
    if (image.startsWith("http")) image = await functions.linkToBase64(image)
    if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
    const metadata = await sharp(image).metadata()
    let buffer = null as any
    if (metadata.format === "gif") {
      if (realTime) return null
      const gifOptions = getGIFOptions()
      const {frameArray, delayArray} = await functions.getGIFFrames(image)
      const newFrameArray = [] as Buffer[]
      for (let i = 0; i < frameArray.length; i++) {
        const newFrame = await sharp(frameArray[i])
          .blur(blur)
          .sharpen(sharpen)
          .toBuffer()
        newFrameArray.push(newFrame)
      }
      const transparentColor = gifOptions.transparency ? gifOptions.transparentColor : undefined
      buffer = await functions.encodeGIF(newFrameArray, delayArray, metadata.width!, metadata.height!, {transparentColor})
    } else {
      buffer = await sharp(image)
        .blur(blur)
        .sharpen(sharpen)
        .toBuffer()
    }
    const base64 = functions.bufferToBase64(buffer, metadata.format ?? "png")
    imgArray.push(base64)
  }
  if (realTime) {
    window?.webContents.send("update-images", imgArray) 
    return null
  }
  updateHistoryState(imgArray)
  return imgArray
})

ipcMain.handle("apply-blur", async (event, state: any) => {
  window?.webContents.send("apply-blur", state)
})

ipcMain.handle("show-blur-dialog", async (event) => {
  if (currentDialog) {
    currentDialog.close()
    revertToLastState()
    // @ts-expect-error
    if (currentDialog.type === "blur") return
  }
  const bounds = window?.getBounds()!
  currentDialog = new BrowserWindow({width: 250, height: 155, x: bounds.x + 70, y: bounds.y + 190, resizable: false, show: false, frame: false, backgroundColor: "#3177f5", webPreferences: {nodeIntegration: true, contextIsolation: false, webSecurity: false}})
  currentDialog.loadFile(path.join(__dirname, "blurdialog.html"))
  currentDialog.removeMenu()
  currentDialog.setAlwaysOnTop(true)
  require("@electron/remote/main").enable(currentDialog.webContents)
  currentDialog.on("ready-to-show", () => {
    currentDialog?.show()
    window?.focus()
  })
  currentDialog.on("closed", () => {
    currentDialog = null
  })
  // @ts-expect-error
  currentDialog.type = "blur"
})

ipcMain.handle("tint", async (event, state: any) => {
  const {tint, realTime} = state
  let images = historyStates[historyIndex] as any
  if (!images) return null
  let imgArray = [] as any[]
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    if (image.startsWith("file:///")) image = image.replace("file:///", "")
    if (image.startsWith("http")) image = await functions.linkToBase64(image)
    if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
    const metadata = await sharp(image).metadata()
    let buffer = null as any
    if (metadata.format === "gif") {
      if (realTime) return null
      const gifOptions = getGIFOptions()
      const {frameArray, delayArray} = await functions.getGIFFrames(image)
      const newFrameArray = [] as Buffer[]
      for (let i = 0; i < frameArray.length; i++) {
        const newFrame = await sharp(frameArray[i])
        .tint(tint)
        .toBuffer()
        newFrameArray.push(newFrame)
      }
      const transparentColor = gifOptions.transparency ? gifOptions.transparentColor : undefined
      buffer = await functions.encodeGIF(newFrameArray, delayArray, metadata.width!, metadata.height!, {transparentColor})
    } else {
      buffer = await sharp(image)
        .tint(tint)
        .toBuffer()
    }
    const base64 = functions.bufferToBase64(buffer, metadata.format ?? "png")
    imgArray.push(base64)
  }
  if (realTime) {
    window?.webContents.send("update-images", imgArray) 
    return null
  }
  updateHistoryState(imgArray)
  return imgArray
})

ipcMain.handle("apply-tint", async (event, state: any) => {
  window?.webContents.send("apply-tint", state)
})

ipcMain.handle("show-tint-dialog", async (event) => {
  if (currentDialog) {
    currentDialog.close()
    revertToLastState()
    // @ts-expect-error
    if (currentDialog.type === "tint") return
  }
  const bounds = window?.getBounds()!
  currentDialog = new BrowserWindow({width: 180, height: 135, x: bounds.x + 70, y: bounds.y + 130, resizable: false, show: false, frame: false, backgroundColor: "#3177f5", webPreferences: {nodeIntegration: true, contextIsolation: false, webSecurity: false}})
  currentDialog.loadFile(path.join(__dirname, "tintdialog.html"))
  currentDialog.removeMenu()
  currentDialog.setAlwaysOnTop(true)
  require("@electron/remote/main").enable(currentDialog.webContents)
  currentDialog.on("ready-to-show", () => {
    currentDialog?.show()
    window?.focus()
  })
  currentDialog.on("closed", () => {
    currentDialog = null
  })
  // @ts-expect-error
  currentDialog.type = "tint"
})

ipcMain.handle("hsl", async (event, state: any) => {
  const {hue, saturation, lightness, realTime} = state
  let images = historyStates[historyIndex] as any
  if (!images) return null
  let imgArray = [] as any[]
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    if (image.startsWith("file:///")) image = image.replace("file:///", "")
    if (image.startsWith("http")) image = await functions.linkToBase64(image)
    if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
    const metadata = await sharp(image).metadata()
    let buffer = null as any
    if (metadata.format === "gif") {
      if (realTime) return null
      const gifOptions = getGIFOptions()
      const {frameArray, delayArray} = await functions.getGIFFrames(image)
      const newFrameArray = [] as Buffer[]
      for (let i = 0; i < frameArray.length; i++) {
        const newFrame = await sharp(frameArray[i])
          .modulate({hue, saturation, lightness})
          .toBuffer()
        newFrameArray.push(newFrame)
      }
      const transparentColor = gifOptions.transparency ? gifOptions.transparentColor : undefined
      buffer = await functions.encodeGIF(newFrameArray, delayArray, metadata.width!, metadata.height!, {transparentColor})
    } else {
      buffer = await sharp(image)
        .modulate({hue, saturation, lightness})
        .toBuffer()
    }
    const base64 = functions.bufferToBase64(buffer, metadata.format ?? "png")
    imgArray.push(base64)
  }
  if (realTime) {
    window?.webContents.send("update-images", imgArray) 
    return null
  }
  updateHistoryState(imgArray)
  return imgArray
})

ipcMain.handle("apply-hsl", async (event, state: any) => {
  window?.webContents.send("apply-hsl", state)
})

ipcMain.handle("show-hsl-dialog", async (event) => {
  if (currentDialog) {
    currentDialog.close()
    revertToLastState()
    // @ts-expect-error
    if (currentDialog.type === "hsl") return
  }
  const bounds = window?.getBounds()!
  currentDialog = new BrowserWindow({width: 250, height: 180, x: bounds.x + 70, y: bounds.y + 50, resizable: false, show: false, frame: false, backgroundColor: "#3177f5", webPreferences: {nodeIntegration: true, contextIsolation: false, webSecurity: false}})
  currentDialog.loadFile(path.join(__dirname, "hsldialog.html"))
  currentDialog.removeMenu()
  currentDialog.setAlwaysOnTop(true)
  require("@electron/remote/main").enable(currentDialog.webContents)
  currentDialog.on("ready-to-show", () => {
    currentDialog?.show()
    window?.focus()
  })
  currentDialog.on("closed", () => {
    currentDialog = null
  })
  // @ts-expect-error
  currentDialog.type = "hsl"
})

ipcMain.handle("brightness", async (event, state: any) => {
  const {brightness, contrast, realTime} = state
  let images = historyStates[historyIndex] as any
  if (!images) return null
  let imgArray = [] as any[]
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    if (image.startsWith("file:///")) image = image.replace("file:///", "")
    if (image.startsWith("http")) image = await functions.linkToBase64(image)
    if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
    const metadata = await sharp(image).metadata()
    let buffer = null as any
    if (metadata.format === "gif") {
      if (realTime) return null
      const gifOptions = getGIFOptions()
      const {frameArray, delayArray} = await functions.getGIFFrames(image)
      const newFrameArray = [] as Buffer[]
      for (let i = 0; i < frameArray.length; i++) {
        const newFrame = await sharp(frameArray[i])
          .modulate({brightness: brightness})
          .linear(contrast, -(128 * contrast) + 128)
          .toBuffer()
        newFrameArray.push(newFrame)
      }
      const transparentColor = gifOptions.transparency ? gifOptions.transparentColor : undefined
      buffer = await functions.encodeGIF(newFrameArray, delayArray, metadata.width!, metadata.height!, {transparentColor})
    } else {
      buffer = await sharp(image)
        .modulate({brightness: brightness})
        .linear(contrast, -(128 * contrast) + 128)
        .toBuffer()
    }
    const base64 = functions.bufferToBase64(buffer, metadata.format ?? "png")
    imgArray.push(base64)
  }
  if (realTime) {
    window?.webContents.send("update-images", imgArray) 
    return null
  }
  updateHistoryState(imgArray)
  return imgArray
})

ipcMain.handle("apply-brightness", async (event, state: any) => {
  window?.webContents.send("apply-brightness", state)
})

ipcMain.handle("show-brightness-dialog", async (event) => {
  if (currentDialog) {
    currentDialog.close()
    revertToLastState()
    // @ts-expect-error
    if (currentDialog.type === "brightness") return
  }
  const backgroundColor = "#3177f5"
  const bounds = window?.getBounds()!
  currentDialog = new BrowserWindow({width: 250, height: 150, x: bounds.x + 70, y: bounds.y + 40, resizable: false, show: false, frame: false, backgroundColor, webPreferences: {nodeIntegration: true, contextIsolation: false, webSecurity: false}})
  currentDialog.loadFile(path.join(__dirname, "brightnessdialog.html"))
  currentDialog.removeMenu()
  currentDialog.setAlwaysOnTop(true)
  require("@electron/remote/main").enable(currentDialog.webContents)
  currentDialog.on("ready-to-show", () => {
    currentDialog?.show()
    window?.focus()
  })
  currentDialog.on("closed", () => {
    currentDialog = null
  })
  // @ts-expect-error
  currentDialog.type = "brightness"
})

const revertToLastState = () => {
  let images = historyStates[historyIndex] as any
  if (images) {
    window?.webContents.send("update-images", images)
  }
}

ipcMain.handle("revert-to-last-state", async (event) => {
  return revertToLastState()
})

ipcMain.handle("get-original-images", async (event) => {
  return originalImages
})

ipcMain.handle("update-original-images", async (event, images: any) => {
  if (typeof images === "string") images = [images]
  originalImages = images
  historyStates = []
  historyIndex = -1
  updateHistoryState(images)
})

ipcMain.handle("reset", async (event) => {
  if (!originalImages) return
  historyStates = []
  historyIndex = -1
  updateHistoryState(originalImages)
  return originalImages
})

ipcMain.handle("redo", async (event) => {
  let images = historyStates[historyIndex + 1] as any
  if (images) {
    historyIndex++
    return images
  }
  return null
})

ipcMain.handle("undo", async (event) => {
  let images = historyStates[historyIndex - 1] as any
  if (images) {
    historyIndex--
    return images
  }
  return null
})

ipcMain.handle("invert", async (event) => {
  let images = historyStates[historyIndex] as any
  const imgArray = []
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    if (image.startsWith("file:///")) image = image.replace("file:///", "")
    if (image.startsWith("http")) image = await functions.linkToBase64(image)
    if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
    const metadata = await sharp(image).metadata()
    let buffer = null as any
    if (metadata.format === "gif") {
      const gifOptions = getGIFOptions()
      const {frameArray, delayArray} = await functions.getGIFFrames(image)
      const newFrameArray = [] as Buffer[]
      for (let i = 0; i < frameArray.length; i++) {
        // @ts-ignore
        const newFrame = await sharp(frameArray[i]).negate({alpha: false}).toBuffer()
        newFrameArray.push(newFrame)
      }
      const transparentColor = gifOptions.transparency ? gifOptions.transparentColor : undefined
      buffer = await functions.encodeGIF(newFrameArray, delayArray, metadata.width!, metadata.height!, {transparentColor})
    } else {
      // @ts-ignore
      buffer = await sharp(image).negate({alpha: false}).toBuffer()
    }
    const base64 = functions.bufferToBase64(buffer, metadata.format ?? "png")
    imgArray.push(base64)
  }
  updateHistoryState(imgArray)
  return imgArray
})

ipcMain.handle("flipY", async (event) => {
  let images = historyStates[historyIndex] as any
  const imgArray = []
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    if (image.startsWith("file:///")) image = image.replace("file:///", "")
    if (image.startsWith("http")) image = await functions.linkToBase64(image)
    if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
    const metadata = await sharp(image).metadata()
    let buffer = null as any
    if (metadata.format === "gif") {
      const gifOptions = getGIFOptions()
      const {frameArray, delayArray} = await functions.getGIFFrames(image)
      const newFrameArray = [] as Buffer[]
      for (let i = 0; i < frameArray.length; i++) {
        const newFrame = await sharp(frameArray[i]).flip().toBuffer()
        newFrameArray.push(newFrame)
      }
      const transparentColor = gifOptions.transparency ? gifOptions.transparentColor : undefined
      buffer = await functions.encodeGIF(newFrameArray, delayArray, metadata.width!, metadata.height!, {transparentColor})
    } else {
      buffer = await sharp(image).flip().toBuffer()
    }
    const base64 = functions.bufferToBase64(buffer, metadata.format ?? "png")
    imgArray.push(base64)
  }
  updateHistoryState(imgArray)
  return imgArray
})

ipcMain.handle("flipX", async (event) => {
  let images = historyStates[historyIndex] as any
  const imgArray = []
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    if (image.startsWith("file:///")) image = image.replace("file:///", "")
    if (image.startsWith("http")) image = await functions.linkToBase64(image)
    if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
    const metadata = await sharp(image).metadata()
    let buffer = null as any
    if (metadata.format === "gif") {
      const gifOptions = getGIFOptions()
      const {frameArray, delayArray} = await functions.getGIFFrames(image)
      const newFrameArray = [] as Buffer[]
      for (let i = 0; i < frameArray.length; i++) {
        const newFrame = await sharp(frameArray[i]).flop().toBuffer()
        newFrameArray.push(newFrame)
      }
      const transparentColor = gifOptions.transparency ? gifOptions.transparentColor : undefined
      buffer = await functions.encodeGIF(newFrameArray, delayArray, metadata.width!, metadata.height!, {transparentColor})
    } else {
      buffer = await sharp(image).flop().toBuffer()
    }
    const base64 = functions.bufferToBase64(buffer, metadata.format ?? "png")
    imgArray.push(base64)
  }
  updateHistoryState(imgArray)
  return imgArray
})

ipcMain.handle("save-dialog", async (event, defaultPath: string) => {
  if (!window) return
  const save = await dialog.showSaveDialog(window, {
    defaultPath,
    filters: [
      {name: "All Files", extensions: ["*"]},
      {name: "PNG", extensions: ["png"]},
      {name: "JPG", extensions: ["jpg"]},
      {name: "GIF", extensions: ["gif"]},
      {name: "WEBP", extensions: ["webp"]},
      {name: "TIFF", extensions: ["tiff"]}
    ],
    properties: ["createDirectory"]
  })
  return save.filePath ? save.filePath : null
})

ipcMain.handle("save-img", async (event) => {
  window?.webContents.send("save-img")
})

ipcMain.handle("copy-address", async (event, image: any) => {
  window?.webContents.send("copy-address", image)
})

ipcMain.handle("trigger-paste", async (event) => {
    window?.webContents.send("trigger-paste")
})

ipcMain.handle("copy-image", async (event, image: any) => {
  window?.webContents.send("copy-image", image)
})

ipcMain.handle("open-link", async (event, link: string) => {
  window?.webContents.send("open-link", link)
})

ipcMain.handle("show-link-dialog", async (event) => {
  window?.webContents.send("close-all-dialogs", "link")
  window?.webContents.send("show-link-dialog")
})

ipcMain.handle("next", async (event) => {
  if (!originalImages) return
  if (originalImages.length > 1) return
  let image = originalImages[0]
  if (image.startsWith("http")) return
  if (image.startsWith("data:")) return
  image = image.replace("file:///", "")
  const directory = path.dirname(image)
  const files = await functions.getSortedFiles(directory)
  const index = files.findIndex((f) => f === path.basename(image))
  if (index !== -1) {
    if (files[index + 1]) return `file:///${directory}/${files[index + 1]}`
  }
  return null
})

ipcMain.handle("previous", async (event) => {
  if (!originalImages) return
  if (originalImages.length > 1) return
  let image = originalImages[0]
  if (image.startsWith("http")) return
  if (image.startsWith("data:")) return
  image = image.replace("file:///", "")
  const directory = path.dirname(image)
  const files = await functions.getSortedFiles(directory)
  const index = files.findIndex((f) => f === path.basename(image))
  if (index !== -1) {
    if (files[index - 1]) return `file:///${directory}/${files[index - 1]}`
  }
  return null
})

ipcMain.handle("upload-file", async () => {
  window?.webContents.send("upload-file")
})

ipcMain.handle("select-directory", async () => {
  if (!window) return
  const files = await dialog.showOpenDialog(window, {
    filters: [
      {name: "All Files", extensions: ["*"]}
    ],
    properties: ["openDirectory", "createDirectory"]
  })
  return files.filePaths[0] ? files.filePaths[0] : null
})

ipcMain.handle("select-file", async () => {
  if (!window) return
  const files = await dialog.showOpenDialog(window, {
    filters: [
      {name: "All Files", extensions: ["*"]},
      {name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "tiff"]},
      {name: "GIF", extensions: ["gif"]}
    ],
    properties: ["openFile", "multiSelections"]
  })
  return files.filePaths[0] ? files.filePaths : null
})

ipcMain.handle("get-theme", () => {
  return store.get("theme", "light")
})

ipcMain.handle("save-theme", (event, theme: string) => {
  store.set("theme", theme)
  currentDialog?.webContents.send("update-theme", theme)
})

ipcMain.handle("install-update", async (event) => {
  if (process.platform === "darwin") {
    const update = await autoUpdater.checkForUpdates()
    const url = `${pack.repository.url}/releases/download/v${update.updateInfo.version}/${update.updateInfo.files[0].url}`
    await shell.openExternal(url)
    app.quit()
  } else {
    await autoUpdater.downloadUpdate()
    autoUpdater.quitAndInstall()
  }
})

ipcMain.handle("check-for-updates", async (event, startup: boolean) => {
  window?.webContents.send("close-all-dialogs", "version")
  const update = await autoUpdater.checkForUpdates()
  const newVersion = update.updateInfo.version
  if (pack.version === newVersion) {
    if (!startup) window?.webContents.send("show-version-dialog", null)
  } else {
    window?.webContents.send("show-version-dialog", newVersion)
  }
})

ipcMain.handle("get-opened-file", () => {
  if (process.platform !== "darwin") {
    return process.argv[1]
  } else {
    return filePath
  }
})

const openFile = (argv?: any) => {
  if (process.platform !== "darwin") {
    let file = argv ? argv[2] : process.argv[1]
    window?.webContents.send("open-file", file)
  }
}

app.on("open-file", (event, file) => {
  filePath = file
  event.preventDefault()
  window?.webContents.send("open-file", file)
})

const singleLock = app.requestSingleInstanceLock()

if (!singleLock) {
  app.quit()
} else {
  app.on("second-instance", (event, argv) => {
    if (window) {
      if (window.isMinimized()) window.restore()
      window.focus()
    }
    openFile(argv)
  })

  app.on("ready", () => {
    window = new BrowserWindow({width: 900, height: 650, minWidth: 520, minHeight: 250, show: false, frame: false, backgroundColor: "#3177f5", center: true, webPreferences: {nodeIntegration: true, contextIsolation: false, enableRemoteModule: true, webSecurity: false}})
    window.loadFile(path.join(__dirname, "index.html"))
    window.removeMenu()
    openFile()
    require("@electron/remote/main").enable(window.webContents)
    window.on("ready-to-show", () => {
      window?.show()
    })
    window.on("closed", () => {
      if (currentDialog) currentDialog.close()
      window = null
    })
    localShortcut.register("Ctrl+Shift+Z", () => {
      window?.webContents.send("trigger-redo")
    }, window, {strict: true})
    localShortcut.register("Ctrl+Z", () => {
      window?.webContents.send("trigger-undo")
    }, window, {strict: true})
    localShortcut.register("Ctrl+V", () => {
      window?.webContents.send("trigger-paste")
    }, window, {strict: true})
    localShortcut.register("Ctrl+S", () => {
      window?.webContents.send("save-img")
    }, window, {strict: true})
    localShortcut.register("Ctrl+O", () => {
      window?.webContents.send("upload-file")
    }, window, {strict: true})
    localShortcut.register("Ctrl+=", () => {
      window?.webContents.send("zoom-in")
    }, window, {strict: true})
    localShortcut.register("Ctrl+-", () => {
      window?.webContents.send("zoom-out")
    }, window, {strict: true})
    if (process.env.DEVELOPMENT === "true") {
      globalShortcut.register("Control+Shift+I", () => {
        window?.webContents.toggleDevTools()
      })
    }
    session.defaultSession.webRequest.onBeforeSendHeaders({urls: ["https://*.pixiv.net/*", "https://*.pximg.net/*"]}, (details, callback) => {
      details.requestHeaders["Referer"] = "https://www.pixiv.net/"
      callback({requestHeaders: details.requestHeaders})
    })
  })
}

app.allowRendererProcessReuse = false
app.commandLine.appendSwitch("no-sandbox")