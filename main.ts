import {app, BrowserWindow, dialog, globalShortcut, ipcMain, session, webContents, screen} from "electron"
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

process.setMaxListeners(0)
let window: Electron.BrowserWindow | null
autoUpdater.autoDownload = false
const store = new Store()

let originalImage = null as any
let originalName = null as any
let historyStates = [] as string[]
let historyIndex = -1

const updateHistoryState = (image: string) => {
  historyIndex++
  historyStates.splice(historyIndex, Infinity, image)
}

const getGIFOptions = () => {
  return store.get("gifOptions", {
    transparency: false,
    transparentColor: "#000000",
    cumulative: true
  }) as {transparency: boolean, transparentColor: string, cumulative: boolean}
}

ipcMain.handle("get-info", () => {
  window?.webContents.send("close-all-dialogs", "info")
  window?.webContents.send("show-info-dialog")
})

ipcMain.handle("get-width-height", async (event, image: any) => {
  const metadata = await sharp(image).metadata()
  return {width: metadata.width, height: metadata.height}
})

ipcMain.handle("get-gif-options", () => {
  return getGIFOptions()
})

ipcMain.handle("set-gif-options", (event: any, state: any) => {
  let {transparency, transparentColor, cumulative} = state
  store.set("gifOptions", {transparency, transparentColor, cumulative})
})

ipcMain.handle("gif-effects", async (event: any, state: any) => {
  let {speed, reverse, transparency, transparentColor, cumulative} = state
  let image = historyStates[historyIndex] as any
  if (!image) return null
  if (image.startsWith("file:///")) image = image.replace("file:///", "")
  if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
  const metadata = await sharp(image).metadata()
  if (metadata.format === "gif") {
    const {frameArray, delayArray} = await functions.getGIFFrames(image, {speed: Number(speed), reverse, cumulative})
    const newFrameArray = [] as Buffer[]
    for (let i = 0; i < frameArray.length; i++) {
      const newFrame = await sharp(frameArray[i]).toBuffer()
      newFrameArray.push(newFrame)
    }
    let transColor = transparency ? transparentColor : undefined
    const buffer = await functions.encodeGIF(newFrameArray, delayArray, metadata.width!, metadata.height!, {transparentColor: transColor})
    const base64 = functions.bufferToBase64(buffer, "gif")
    updateHistoryState(base64)
    window?.webContents.send("update-image", base64)
    store.set("gifOptions", {transparency, transparentColor, cumulative})
  }
})

ipcMain.handle("show-gif-dialog", async (event) => {
  window?.webContents.send("close-all-dialogs", "gif")
  window?.webContents.send("show-gif-dialog")
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
})

ipcMain.handle("enter-pressed", () => {
  window?.webContents.send("enter-pressed")
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

const getMetadata = async (image: any, toBuffer?: boolean) => {
  if (!image) return null
  let dataURL = false
  if (image.startsWith("file:///")) image = image.replace("file:///", "")
  if (image.startsWith("data:")) {
    image = functions.base64ToBuffer(image)
    dataURL = true
  }
  let metadata = await sharp(image).metadata()
  if (metadata.format !== "gif" && toBuffer) {
    metadata = await sharp(await sharp(image).toBuffer()).metadata()
  }
  let name = dataURL ? "Image" : path.basename(image, path.extname(image))
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
  return {name, width, height, size, format, dpi, frames, space}
}

ipcMain.handle("get-original-metadata", async () => {
  return getMetadata(originalImage, true)
})

ipcMain.handle("get-metadata", async () => {
  let image = historyStates[historyIndex] as any
  return getMetadata(image)
})

ipcMain.handle("crop", async (event, state: any) => {
  const {x, y, width, height} = state
  let image = historyStates[historyIndex] as any
  if (!image) return null
  if (width === 0 || height === 0) return null
  if (image.startsWith("file:///")) image = image.replace("file:///", "")
  if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
  const metadata = await sharp(image).metadata()
  const cropX = Math.round(metadata.width! / 100 * x)
  const cropY = Math.round(metadata.height! / 100 * y)
  const cropWidth = Math.round(metadata.width! / 100 * width)
  const cropHeight = Math.round(metadata.height! / 100 * height)
  let buffer = null as any
  if (metadata.format === "gif") {
    const gifOptions = getGIFOptions()
    const {frameArray, delayArray} = await functions.getGIFFrames(image, {cumulative: gifOptions.cumulative})
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
  updateHistoryState(base64)
  return base64
})

ipcMain.handle("rotate", async (event, state: any) => {
  const {degrees, realTime} = state
  let image = historyStates[historyIndex] as any
  if (!image) return null
  if (image.startsWith("file:///")) image = image.replace("file:///", "")
  if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
  const metadata = await sharp(image).metadata()
  let buffer = null as any
  if (metadata.format === "gif") {
    if (realTime) return null
    const gifOptions = getGIFOptions()
    const {frameArray, delayArray} = await functions.getGIFFrames(image, {cumulative: gifOptions.cumulative})
    const newFrameArray = [] as Buffer[]
    for (let i = 0; i < frameArray.length; i++) {
      const newFrame = await sharp(frameArray[i])
      .rotate(degrees)
      .toBuffer()
      newFrameArray.push(newFrame)
    }
    const newMeta = await sharp(newFrameArray[0]).metadata()
    const transparentColor = gifOptions.transparency ? gifOptions.transparentColor : undefined
    buffer = await functions.encodeGIF(newFrameArray, delayArray, newMeta.width!, newMeta.height!, {transparentColor})
  } else {
    buffer = await sharp(image)
      .rotate(degrees)
      .toBuffer()
  }
  const base64 = functions.bufferToBase64(buffer, metadata.format ?? "png")
  if (realTime) {
    window?.webContents.send("update-image", base64) 
    return null
  }
  updateHistoryState(base64)
  return base64
})

ipcMain.handle("apply-rotate", async (event, state: any) => {
  window?.webContents.send("apply-rotate", state)
})

ipcMain.handle("show-rotate-dialog", async (event) => {
  window?.webContents.send("close-all-dialogs", "rotate")
  window?.webContents.send("show-rotate-dialog")
})

ipcMain.handle("resize", async (event, state: any) => {
  const {width, height, realTime} = state
  let image = historyStates[historyIndex] as any
  if (!image) return null
  if (Number.isNaN(width) || Number.isNaN(height) || !Number(width)|| !Number(height)) return null
  if (image.startsWith("file:///")) image = image.replace("file:///", "")
  if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
  const metadata = await sharp(image).metadata()
  let buffer = null as any
  if (metadata.format === "gif") {
    if (realTime) return null
    const gifOptions = getGIFOptions()
    const {frameArray, delayArray} = await functions.getGIFFrames(image, {cumulative: gifOptions.cumulative})
    const newFrameArray = [] as Buffer[]
    for (let i = 0; i < frameArray.length; i++) {
      const newFrame = await sharp(frameArray[i])
      .resize(Number(width), Number(height), {fit: "fill", kernel: "cubic"})
      .toBuffer()
      newFrameArray.push(newFrame)
    }
    const transparentColor = gifOptions.transparency ? gifOptions.transparentColor : undefined
    buffer = await functions.encodeGIF(newFrameArray, delayArray, Number(width), Number(height), {transparentColor})
  } else {
    buffer = await sharp(image)
      .resize(Number(width), Number(height), {fit: "fill", kernel: "cubic"})
      .toBuffer()
  }
  const base64 = functions.bufferToBase64(buffer, metadata.format ?? "png")
  if (realTime) {
    window?.webContents.send("update-image", base64) 
    return null
  }
  updateHistoryState(base64)
  return base64
})

ipcMain.handle("apply-resize", async (event, state: any) => {
  window?.webContents.send("apply-resize", state)
})

ipcMain.handle("show-resize-dialog", async (event) => {
  window?.webContents.send("close-all-dialogs", "resize")
  window?.webContents.send("show-resize-dialog")
})

ipcMain.handle("binarize", async (event, state: any) => {
  const {binarize, realTime} = state
  let image = historyStates[historyIndex] as any
  if (!image) return null
  if (image.startsWith("file:///")) image = image.replace("file:///", "")
  if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
  const metadata = await sharp(image).metadata()
  let buffer = null as any
  if (metadata.format === "gif") {
    if (realTime) return null
    const gifOptions = getGIFOptions()
    const {frameArray, delayArray} = await functions.getGIFFrames(image, {cumulative: gifOptions.cumulative})
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
  if (realTime) {
    window?.webContents.send("update-image", base64) 
    return null
  }
  updateHistoryState(base64)
  return base64
})

ipcMain.handle("apply-binarize", async (event, state: any) => {
  window?.webContents.send("apply-binarize", state)
})

ipcMain.handle("show-binarize-dialog", async (event) => {
  window?.webContents.send("close-all-dialogs", "binarize")
  window?.webContents.send("show-binarize-dialog")
})

ipcMain.handle("pixelate", async (event, state: any) => {
  const {strength, realTime} = state
  let image = historyStates[historyIndex] as any
  if (!image) return null
  if (image.startsWith("file:///")) image = image.replace("file:///", "")
  if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
  const metadata = await sharp(image).metadata()
  let buffer = null as any
  if (metadata.format === "gif") {
    if (realTime) return null
    const gifOptions = getGIFOptions()
    const {frameArray, delayArray} = await functions.getGIFFrames(image, {cumulative: gifOptions.cumulative})
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
  if (realTime) {
    window?.webContents.send("update-image", base64) 
    return null
  }
  updateHistoryState(base64)
  return base64
})

ipcMain.handle("apply-pixelate", async (event, state: any) => {
  window?.webContents.send("apply-pixelate", state)
})

ipcMain.handle("show-pixelate-dialog", async (event) => {
  window?.webContents.send("close-all-dialogs", "pixelate")
  window?.webContents.send("show-pixelate-dialog")
})

ipcMain.handle("blur", async (event, state: any) => {
  const {blur, sharpen, realTime} = state
  let image = historyStates[historyIndex] as any
  if (!image) return null
  if (image.startsWith("file:///")) image = image.replace("file:///", "")
  if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
  const metadata = await sharp(image).metadata()
  let buffer = null as any
  if (metadata.format === "gif") {
    if (realTime) return null
    const gifOptions = getGIFOptions()
    const {frameArray, delayArray} = await functions.getGIFFrames(image, {cumulative: gifOptions.cumulative})
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
  if (realTime) {
    window?.webContents.send("update-image", base64) 
    return null
  }
  updateHistoryState(base64)
  return base64
})

ipcMain.handle("apply-blur", async (event, state: any) => {
  window?.webContents.send("apply-blur", state)
})

ipcMain.handle("show-blur-dialog", async (event) => {
  window?.webContents.send("close-all-dialogs", "blur")
  window?.webContents.send("show-blur-dialog")
})

ipcMain.handle("tint", async (event, state: any) => {
  const {tint, realTime} = state
  let image = historyStates[historyIndex] as any
  if (!image) return null
  if (image.startsWith("file:///")) image = image.replace("file:///", "")
  if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
  const metadata = await sharp(image).metadata()
  let buffer = null as any
  if (metadata.format === "gif") {
    if (realTime) return null
    const gifOptions = getGIFOptions()
    const {frameArray, delayArray} = await functions.getGIFFrames(image, {cumulative: gifOptions.cumulative})
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
  if (realTime) {
    window?.webContents.send("update-image", base64) 
    return null
  }
  updateHistoryState(base64)
  return base64
})

ipcMain.handle("apply-tint", async (event, state: any) => {
  window?.webContents.send("apply-tint", state)
})

ipcMain.handle("show-tint-dialog", async (event) => {
  window?.webContents.send("close-all-dialogs", "tint")
  window?.webContents.send("show-tint-dialog")
})

ipcMain.handle("hsl", async (event, state: any) => {
  const {hue, saturation, lightness, realTime} = state
  let image = historyStates[historyIndex] as any
  if (!image) return null
  if (image.startsWith("file:///")) image = image.replace("file:///", "")
  if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
  const metadata = await sharp(image).metadata()
  let buffer = null as any
  if (metadata.format === "gif") {
    if (realTime) return null
    const gifOptions = getGIFOptions()
    const {frameArray, delayArray} = await functions.getGIFFrames(image, {cumulative: gifOptions.cumulative})
    const newFrameArray = [] as Buffer[]
    for (let i = 0; i < frameArray.length; i++) {
      const newFrame = await sharp(frameArray[i])
        .modulate({hue, saturation, brightness: lightness})
        .toBuffer()
      newFrameArray.push(newFrame)
    }
    const transparentColor = gifOptions.transparency ? gifOptions.transparentColor : undefined
    buffer = await functions.encodeGIF(newFrameArray, delayArray, metadata.width!, metadata.height!, {transparentColor})
  } else {
    buffer = await sharp(image)
      .modulate({hue, saturation, brightness: lightness})
      .toBuffer()
  }
  const base64 = functions.bufferToBase64(buffer, metadata.format ?? "png")
  if (realTime) {
    window?.webContents.send("update-image", base64) 
    return null
  }
  updateHistoryState(base64)
  return base64
})

ipcMain.handle("apply-hsl", async (event, state: any) => {
  window?.webContents.send("apply-hsl", state)
})

ipcMain.handle("show-hsl-dialog", async (event) => {
  window?.webContents.send("close-all-dialogs", "hsl")
  window?.webContents.send("show-hsl-dialog")
})

ipcMain.handle("brightness", async (event, state: any) => {
  const {brightness, contrast, realTime} = state
  let image = historyStates[historyIndex] as any
  if (!image) return null
  if (image.startsWith("file:///")) image = image.replace("file:///", "")
  if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
  const metadata = await sharp(image).metadata()
  let buffer = null as any
  if (metadata.format === "gif") {
    if (realTime) return null
    const gifOptions = getGIFOptions()
    const {frameArray, delayArray} = await functions.getGIFFrames(image, {cumulative: gifOptions.cumulative})
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
  if (realTime) {
    window?.webContents.send("update-image", base64) 
    return null
  }
  updateHistoryState(base64)
  return base64
})

ipcMain.handle("apply-brightness", async (event, state: any) => {
  window?.webContents.send("apply-brightness", state)
})

ipcMain.handle("show-brightness-dialog", async (event) => {
  window?.webContents.send("close-all-dialogs", "brightness")
  window?.webContents.send("show-brightness-dialog")
})

ipcMain.handle("save-image", async (event, image: any, savePath: string) => {
  if (image.startsWith("file:///")) image = image.replace("file:///", "")
  if (path.extname(savePath) === ".gif") {
    functions.downloadImage(image, savePath)
  } else {
    if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
    sharp(image).toFile(savePath)
  }
})

ipcMain.handle("revert-to-last-state", async (event) => {
  let image = historyStates[historyIndex] as any
  if (image) {
    window?.webContents.send("update-image", image)
  }
})

ipcMain.handle("get-original-image", async (event) => {
  return originalImage
})

ipcMain.handle("update-original-image", async (event, image: any) => {
  originalImage = image
  historyStates = []
  historyIndex = -1
  updateHistoryState(image)
})

ipcMain.handle("reset", async (event) => {
  if (!originalImage) return
  historyStates = []
  historyIndex = -1
  updateHistoryState(originalImage)
  return originalImage
})

ipcMain.handle("redo", async (event) => {
  let image = historyStates[historyIndex + 1] as any
  if (image) {
    historyIndex++
    return image
  }
  return null
})

ipcMain.handle("undo", async (event) => {
  let image = historyStates[historyIndex - 1] as any
  if (image) {
    historyIndex--
    return image
  }
  return null
})

ipcMain.handle("invert", async (event, image: any) => {
  if (image.startsWith("file:///")) image = image.replace("file:///", "")
  if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
  const metadata = await sharp(image).metadata()
  let buffer = null as any
  if (metadata.format === "gif") {
    const gifOptions = getGIFOptions()
    const {frameArray, delayArray} = await functions.getGIFFrames(image, {cumulative: gifOptions.cumulative})
    const newFrameArray = [] as Buffer[]
    for (let i = 0; i < frameArray.length; i++) {
      const newFrame = await sharp(frameArray[i]).negate().toBuffer()
      newFrameArray.push(newFrame)
    }
    const transparentColor = gifOptions.transparency ? gifOptions.transparentColor : undefined
    buffer = await functions.encodeGIF(newFrameArray, delayArray, metadata.width!, metadata.height!, {transparentColor})
  } else {
    buffer = await sharp(image).negate().toBuffer()
  }
  const base64 = functions.bufferToBase64(buffer, metadata.format ?? "png")
  updateHistoryState(base64)
  return base64
})

ipcMain.handle("flipY", async (event, image: any) => {
  if (image.startsWith("file:///")) image = image.replace("file:///", "")
  if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
  const metadata = await sharp(image).metadata()
  let buffer = null as any
  if (metadata.format === "gif") {
    const gifOptions = getGIFOptions()
    const {frameArray, delayArray} = await functions.getGIFFrames(image, {cumulative: gifOptions.cumulative})
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
  updateHistoryState(base64)
  return base64
})

ipcMain.handle("flipX", async (event, image: any) => {
  if (image.startsWith("file:///")) image = image.replace("file:///", "")
  if (image.startsWith("data:")) image = functions.base64ToBuffer(image)
  const metadata = await sharp(image).metadata()
  let buffer = null as any
  if (metadata.format === "gif") {
    const gifOptions = getGIFOptions()
    const {frameArray, delayArray} = await functions.getGIFFrames(image, {cumulative: gifOptions.cumulative})
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
  updateHistoryState(base64)
  return base64
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

ipcMain.handle("save-img-context", async (event) => {
  window?.webContents.send("save-img-context")
})

ipcMain.handle("copy-address", async (event) => {
  window?.webContents.send("copy-address")
})

ipcMain.handle("trigger-paste", async (event) => {
    window?.webContents.send("trigger-paste")
})

ipcMain.handle("copy-image", async (event) => {
  window?.webContents.send("copy-image")
})

ipcMain.handle("open-link", async (event, link: string) => {
  window?.webContents.send("open-link", link)
})

ipcMain.handle("show-link-dialog", async (event) => {
  window?.webContents.send("close-all-dialogs", "link")
  window?.webContents.send("show-link-dialog")
})

ipcMain.handle("next", async (event) => {
  if (!originalImage) return
  let image = originalImage
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
  if (!originalImage) return
  let image = originalImage
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

ipcMain.handle("select-file", async () => {
  if (!window) return
  const files = await dialog.showOpenDialog(window, {
    filters: [
      {name: "All Files", extensions: ["*"]},
      {name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "tiff"]},
      {name: "GIF", extensions: ["gif"]}
    ],
    properties: ["openFile"]
  })
  return files.filePaths[0] ? files.filePaths[0] : null
})

ipcMain.handle("get-theme", () => {
  return store.get("theme", "light")
})

ipcMain.handle("save-theme", (event, theme: string) => {
  store.set("theme", theme)
})

ipcMain.handle("install-update", async (event) => {
  await autoUpdater.downloadUpdate()
  autoUpdater.quitAndInstall()
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
  return process.argv[1]
})

const openFile = (argv?: any) => {
  let file = argv ? argv[2] : process.argv[1]
  window?.webContents.send("open-file", file)
}

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
    window = new BrowserWindow({width: 900, height: 650, minWidth: 720, minHeight: 450, frame: false, backgroundColor: "#3177f5", center: true, webPreferences: {nodeIntegration: true, contextIsolation: false, enableRemoteModule: true, webSecurity: false}})
    window.loadFile(path.join(__dirname, "index.html"))
    window.removeMenu()
    openFile()
    window.on("closed", () => {
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