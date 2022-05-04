import React, {useEffect, useState, useRef, useReducer} from "react"
import {ipcRenderer, clipboard, nativeImage} from "electron" 
import {app} from "@electron/remote"
import ReactCrop from "react-image-crop"
import path from "path"
import brightnessButton from "../assets/icons/brightness.png"
import brightnessButtonHover from "../assets/icons/brightness-hover.png"
import hueButton from "../assets/icons/hue.png"
import hueButtonHover from "../assets/icons/hue-hover.png"
import tintButton from "../assets/icons/tint.png"
import tintButtonHover from "../assets/icons/tint-hover.png"
import blurButton from "../assets/icons/blur.png"
import blurButtonHover from "../assets/icons/blur-hover.png"
import pixelateButton from "../assets/icons/pixelate.png"
import pixelateButtonHover from "../assets/icons/pixelate-hover.png"
import invertButton from "../assets/icons/invert.png"
import invertButtonHover from "../assets/icons/invert-hover.png"
import binarizeButton from "../assets/icons/binarize.png"
import binarizeButtonHover from "../assets/icons/binarize-hover.png"
import cropButton from "../assets/icons/crop.png"
import cropButtonHover from "../assets/icons/crop-hover.png"
import resizeButton from "../assets/icons/resize.png"
import resizeButtonHover from "../assets/icons/resize-hover.png"
import rotateButton from "../assets/icons/rotate.png"
import rotateButtonHover from "../assets/icons/rotate-hover.png"
import flipXButton from "../assets/icons/flipx.png"
import flipXButtonHover from "../assets/icons/flipx-hover.png"
import flipYButton from "../assets/icons/flipy.png"
import flipYButtonHover from "../assets/icons/flipy-hover.png"
import undoButton from "../assets/icons/undo.png"
import undoButtonHover from "../assets/icons/undo-hover.png"
import redoButton from "../assets/icons/redo.png"
import redoButtonHover from "../assets/icons/redo-hover.png"
import saveButton from "../assets/icons/save.png"
import saveButtonHover from "../assets/icons/save-hover.png"
import resetButton from "../assets/icons/reset.png"
import resetButtonHover from "../assets/icons/reset-hover.png"
import previousButton from "../assets/icons/previous.png"
import previousButtonHover from "../assets/icons/previous-hover.png"
import nextButton from "../assets/icons/next.png"
import nextButtonHover from "../assets/icons/next-hover.png"
import functions from "../structures/functions"
import fs from "fs"
import {TransformWrapper, TransformComponent} from "react-zoom-pan-pinch"
import BulkContainer from "./BulkContainer"
import {useDropzone} from "react-dropzone"
import "react-image-crop/dist/ReactCrop.css"
import "../styles/photoviewer.less"

const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".tiff", ".gif"]

let oldY = 0

const PhotoViewer: React.FunctionComponent = (props) => {
    const [brightnessHover, setBrightnessHover] = useState(false)
    const [hueHover, setHueHover] = useState(false)
    const [tintHover, setTintHover] = useState(false)
    const [blurHover, setBlurHover] = useState(false)
    const [pixelateHover, setPixelateHover] = useState(false)
    const [invertHover, setInvertHover] = useState(false)
    const [binarizeHover, setBinarizeHover] = useState(false)
    const [cropHover, setCropHover] = useState(false)
    const [resizeHover, setResizeHover] = useState(false)
    const [rotateHover, setRotateHover] = useState(false)
    const [flipXHover, setFlipXHover] = useState(false)
    const [flipYHover, setFlipYHover] = useState(false)
    const [undoHover, setUndoHover] = useState(false)
    const [redoHover, setRedoHover] = useState(false)
    const [saveHover, setSaveHover] = useState(false)
    const [resetHover, setResetHover] = useState(false)
    const [previousHover, setPreviousHover] = useState(false)
    const [nextHover, setNextHover] = useState(false)
    const [image, setImage] = useState("")
    const [hover, setHover] = useState(false)
    const initialCropState = {unit: "%", x: 0, y: 0, width: 100, height: 100, aspect: undefined}
    const [cropState, setCropState] = useState(initialCropState)
    const [cropEnabled, setCropEnabled] = useState(false)
    const [zoomScale, setZoomScale] = useState(1)
    const [rotateDegrees, setRotateDegrees] = useState(0)
    const [rotateEnabled, setRotateEnabled] = useState(false)
    const [bulk, setBulk] = useState(false)
    const [bulkFiles, setBulkFiles] = useState(null) as any
    const [ignored, forceUpdate] = useReducer(x => x + 1, 0)
    const zoomRef = useRef(null) as any

    useEffect(() => {
        const getOpenedFile = async () => {
            const file = await ipcRenderer.invoke("get-opened-file")
            if (file && imageExtensions.includes(path.extname(file))) {
                upload (file)
            }
        }
        getOpenedFile()
        const openFile = (event: any, file: string) => {
            if (file) upload(file)
        }
        const uploadFile = (event: any) => {
            upload()
        }
        const openLink = async (event: any, link: string) => {
            if (link) {
                let img = link
                if (link.includes("pixiv.net") || link.includes("pximg.net")) {
                    const {name, url, siteUrl} = await functions.parsePixivLink(link)
                    ipcRenderer.invoke("set-original-name", name)
                    ipcRenderer.invoke("set-original-link", siteUrl)
                    img = url
                } else {
                    ipcRenderer.invoke("set-original-link", img)
                    ipcRenderer.invoke("set-original-name", null)
                }
                setImage(img)
                ipcRenderer.invoke("update-original-images", img)
                resetZoom()
                resetRotation()
                setBulk(false)
                setBulkFiles(null)
            }
        }
        const triggerPaste = () => {
            const img = clipboard.readImage()
            if (img.isEmpty()) return
            const base64 = functions.bufferToBase64(img.toPNG(), "png")
            setImage(base64)
            ipcRenderer.invoke("update-original-images", base64)
            ipcRenderer.invoke("set-original-name", null)
            ipcRenderer.invoke("set-original-link", null)
            resetZoom()
            resetRotation()
            setBulk(false)
            setBulkFiles(null)
        }
        const triggerUndo = () => {
            undo()
        }
        const triggerRedo = () => {
            redo()
        }
        const resetBounds = () => {
            resetZoom()
            resetRotation()
        }
        const doubleClick = () => {
            resetRotation()
        }
        ipcRenderer.on("open-file", openFile)
        ipcRenderer.on("open-link", openLink)
        ipcRenderer.on("upload-file", uploadFile)
        ipcRenderer.on("trigger-paste", triggerPaste)
        ipcRenderer.on("apply-brightness", brightness)
        ipcRenderer.on("apply-hsl", hue)
        ipcRenderer.on("apply-tint", tint)
        ipcRenderer.on("apply-blur", blur)
        ipcRenderer.on("apply-pixelate", pixelate)
        ipcRenderer.on("apply-resize", resize)
        ipcRenderer.on("apply-rotate", rotate)
        ipcRenderer.on("apply-binarize", binarize)
        ipcRenderer.on("apply-crop", bulkCrop)
        ipcRenderer.on("trigger-undo", triggerUndo)
        ipcRenderer.on("trigger-redo", triggerRedo)
        ipcRenderer.on("zoom-in", zoomIn)
        ipcRenderer.on("zoom-out", zoomOut)
        ipcRenderer.on("reset-bounds", resetBounds)
        ipcRenderer.on("bulk-process", bulkProcess)
        document.addEventListener("dblclick", doubleClick)
        return () => {
            ipcRenderer.removeListener("open-file", openFile)
            ipcRenderer.removeListener("upload-file", openFile)
            ipcRenderer.removeListener("open-link", openLink)
            ipcRenderer.removeListener("trigger-paste", triggerPaste)
            ipcRenderer.removeListener("apply-brightness", brightness)
            ipcRenderer.removeListener("apply-hsl", hue)
            ipcRenderer.removeListener("apply-tint", tint)
            ipcRenderer.removeListener("apply-blur", blur)
            ipcRenderer.removeListener("apply-pixelate", pixelate)
            ipcRenderer.removeListener("apply-resize", resize)
            ipcRenderer.removeListener("apply-rotate", rotate)
            ipcRenderer.removeListener("apply-binarize", binarize)
            ipcRenderer.removeListener("trigger-undo", triggerUndo)
            ipcRenderer.removeListener("trigger-redo", triggerRedo)
            ipcRenderer.removeListener("zoom-in", zoomIn)
            ipcRenderer.removeListener("zoom-out", zoomOut)
            ipcRenderer.removeListener("reset-bounds", resetBounds)
            ipcRenderer.removeListener("bulk-process", bulkProcess)
            document.removeEventListener("dblclick", doubleClick)
            ipcRenderer.removeListener("apply-crop", bulkCrop)
        }
    }, [])

    const onDrop = (files: any) => {
        files = files.map((f: any) => f.path)
        if (files[0]) {
            upload(files)
        }
    }

    const {getRootProps} = useDropzone({onDrop})

    useEffect(() => {
        const copyImage = (event: any, img: any) => {
            if (bulk) {
                if (!img) return
                if (img.startsWith("data:")) {
                    clipboard.writeImage(nativeImage.createFromBuffer(functions.base64ToBuffer(img)))
                } else {
                    clipboard.writeImage(nativeImage.createFromPath(img.replace("file:///", "")))
                }
            } else {
                if (image.startsWith("data:")) {
                    clipboard.writeImage(nativeImage.createFromBuffer(functions.base64ToBuffer(image)))
                } else {
                    clipboard.writeImage(nativeImage.createFromPath(image.replace("file:///", "")))
                }
            }
        }
        const copyAddress = async (event: any, img: any) => {
            if (bulk) {
                if (!img) return
                clipboard.writeText(img)
            } else {
                const originalLink = await ipcRenderer.invoke("get-original-link")
                if (originalLink) {
                    clipboard.writeText(originalLink)
                } else {
                    const img = await ipcRenderer.invoke("get-original-images")
                    clipboard.writeText(img[0])
                }
            }
        }
        const updateImages = (event: any, images: string) => {
            if (images) bulk ? setBulkFiles(images) : setImage(images[0])
        }
        ipcRenderer.on("copy-image", copyImage)
        ipcRenderer.on("copy-address", copyAddress)
        ipcRenderer.on("save-img", save)
        ipcRenderer.on("update-images", updateImages)
        return () => {
            ipcRenderer.removeListener("copy-image", copyImage)
            ipcRenderer.removeListener("copy-address", copyAddress)
            ipcRenderer.removeListener("save-img", save)
            ipcRenderer.removeListener("update-images", updateImages)
        }
    }, [image, bulk, bulkFiles])

    useEffect(() => {
        const crop = async (response: "accept" | "cancel" | "square") => {
            if (response === "square") {
                return setCropState((prev: any) => {
                    return {...prev, aspect: prev.aspect ? undefined : 1}
                })
            } else if (response === "accept") {
                const newImages = await ipcRenderer.invoke("crop", cropState)
                if (newImages) bulk ? setBulkFiles(newImages) : setImage(newImages[0])
            }
            toggleCrop(false)
        }
        const acceptActionResponse = (event: any, action: string, response: "accept" | "cancel" | "square") => {
            if (action === "crop") {
                crop(response)
            }
        }
        const keyDown = async (event: globalThis.KeyboardEvent) => {
            if (event.key === "Enter") {
                if (cropEnabled) crop("accept")
                ipcRenderer.invoke("enter-pressed")
            }
            if (event.key === "Escape") {
                if (cropEnabled) crop("cancel")
                ipcRenderer.invoke("escape-pressed")
                resetRotation()
            }
            if (event.code === "Space") {
                const selection = document.querySelector(".ReactCrop__crop-selection") as HTMLDivElement
                if (selection?.style.opacity === "1") {
                    setCropEnabled(false)
                    functions.cropDrag(false)
                }
                document.documentElement.style.setProperty("cursor", "grab", "important")
            }
            if (event.key === "r") {
                if (rotateEnabled) {
                    const selection = document.querySelector(".ReactCrop__crop-selection") as HTMLDivElement
                    if (selection?.style.opacity === "1") {
                        setCropEnabled(true)
                        functions.cropDrag(true)
                    }
                    document.documentElement.style.setProperty("cursor", "default")
                    setRotateEnabled(false)
                } else {
                    const selection = document.querySelector(".ReactCrop__crop-selection") as HTMLDivElement
                    if (selection?.style.opacity === "1") {
                        setCropEnabled(false)
                        functions.cropDrag(false)
                    }
                    document.documentElement.style.setProperty("cursor", "row-resize", "important")
                    setRotateEnabled(true)
                }
            }
        }
        const keyUp = (event: globalThis.KeyboardEvent) => {
            if (event.code === "Space") {
                const selection = document.querySelector(".ReactCrop__crop-selection") as HTMLDivElement
                if (selection?.style.opacity === "1") {
                    setCropEnabled(true)
                    functions.cropDrag(true)
                }
                document.documentElement.style.setProperty("cursor", "default")
            }
        }
        const mouseMove = (event: MouseEvent) => {
                if (rotateEnabled) {
                    if (event.pageY > oldY) {
                        // Up
                        setRotateDegrees((prev) => {
                            const newDegrees = prev - 3
                            if (newDegrees < -180) return 180
                            return newDegrees
                        })
                    } else if (event.pageY < oldY) {
                        // Down
                        setRotateDegrees((prev) => {
                            const newDegrees = prev + 3
                            if (newDegrees > 180) return -180
                            return newDegrees
                        })
                    }
                    oldY = event.pageY
                }
        }
        const onClick = async () => {
            const selection = document.querySelector(".ReactCrop__crop-selection") as HTMLDivElement
            if (selection?.style.opacity === "1") {
                setCropEnabled(true)
                functions.cropDrag(true)
            }
            document.documentElement.style.setProperty("cursor", "default")
            setRotateEnabled(false)
        }
        ipcRenderer.on("accept-action-response", acceptActionResponse)
        document.addEventListener("keydown", keyDown)
        document.addEventListener("keyup", keyUp)
        document.addEventListener("mousemove", mouseMove)
        document.addEventListener("click", onClick)
        return () => {
            ipcRenderer.removeListener("accept-action-response", acceptActionResponse)
            document.removeEventListener("keydown", keyDown)
            document.removeEventListener("keyup", keyUp)
            document.removeEventListener("mousemove", mouseMove)
            document.removeEventListener("click", onClick)
        }
    })

    const upload = async (files?: string | string[]) => {
        if (typeof files === "string") files = [files]
        if (!files) files = await ipcRenderer.invoke("select-file") as string[]
        if (!files) return
        files = files.filter((f) => imageExtensions.includes(path.extname(f)))
        if (files.length > 1) {
            setBulkFiles(files)
            setBulk(true)
            return ipcRenderer.invoke("update-original-images", files)
        }
        const file = files[0]
        if (!imageExtensions.includes(path.extname(file))) return
        let newImg = file
        if (path.extname(file) === ".tiff") {
            newImg = await ipcRenderer.invoke("tiff-to-png", file)
            ipcRenderer.invoke("set-original-name", path.basename(file, path.extname(file)))
        }
        setImage(newImg)
        ipcRenderer.invoke("resize-window", newImg)
        ipcRenderer.invoke("update-original-images", newImg)
        ipcRenderer.invoke("set-original-link", null)
        resetZoom()
        resetRotation()
        setBulk(false)
        setBulkFiles(null)
    }

    const bulkCrop = async (event: any, state: any) => {
        const newImages = await ipcRenderer.invoke("crop", state)
        if (newImages) bulk ? setBulkFiles(newImages) : setImage(newImages[0])
    }

    const brightness = async (event?: any, state?: any) => {
        if (!state) {
            ipcRenderer.invoke("show-brightness-dialog")
        } else {
            const newImages = await ipcRenderer.invoke("brightness", state)
            if (newImages) bulk ? setBulkFiles(newImages) : setImage(newImages[0])
        }
    }

    const hue = async (event?: any, state?: any) => {
        if (!state) {
            ipcRenderer.invoke("show-hsl-dialog")
        } else {
            const newImages = await ipcRenderer.invoke("hsl", state)
            if (newImages) bulk ? setBulkFiles(newImages) : setImage(newImages[0])
        }
    }

    const tint = async (event?: any, state?: any) => {
        if (!state) {
            ipcRenderer.invoke("show-tint-dialog")
        } else {
            const newImages = await ipcRenderer.invoke("tint", state)
            if (newImages) bulk ? setBulkFiles(newImages) : setImage(newImages[0])
        }
    }

    const blur = async (event?: any, state?: any) => {
        if (!state) {
            ipcRenderer.invoke("show-blur-dialog")
        } else {
            const newImages = await ipcRenderer.invoke("blur", state)
            if (newImages) bulk ? setBulkFiles(newImages) : setImage(newImages[0])
        }
    }

    const pixelate = async (event?: any, state?: any) => {
        if (!state) {
            ipcRenderer.invoke("show-pixelate-dialog")
        } else {
            const newImages = await ipcRenderer.invoke("pixelate", state)
            if (newImages) bulk ? setBulkFiles(newImages) : setImage(newImages[0])
        }
    }

    const invert = async () => {
        const newImages = await ipcRenderer.invoke("invert")
        if (newImages) bulk ? setBulkFiles(newImages) : setImage(newImages[0])
    }

    const binarize = async (event?: any, state?: any) => {
        if (!state) {
            ipcRenderer.invoke("show-binarize-dialog")
        } else {
            const newImages = await ipcRenderer.invoke("binarize", state)
            if (newImages) bulk ? setBulkFiles(newImages) : setImage(newImages[0])
        }
    }

    const toggleCrop = (value?: boolean) => {
        if (bulk) {
            ipcRenderer.invoke("show-crop-dialog")
        } else {
            let newState = value !== undefined ? value : !cropEnabled
            if (newState === true) {
                const selection = document.querySelector(".ReactCrop__crop-selection") as HTMLDivElement
                selection.style.opacity = "1"
                setCropState((prev) => {
                    return {...prev, x: 0, y: 0, width: 100, height: 100}
                })
                setCropEnabled(true)
                functions.cropDrag(true)
                ipcRenderer.invoke("trigger-accept-action", "crop")
            } else {
                const selection = document.querySelector(".ReactCrop__crop-selection") as HTMLDivElement
                selection.style.opacity = "0"
                setCropEnabled(false)
                functions.cropDrag(false)
                ipcRenderer.invoke("clear-accept-action")
            }
        }
    }

    const resize = async (event?: any, state?: any) => {
        if (!state) {
            ipcRenderer.invoke("show-resize-dialog")
        } else {
            const newImages = await ipcRenderer.invoke("resize", state)
            if (newImages) bulk ? setBulkFiles(newImages) : setImage(newImages[0])
        }
    }

    const rotate = async (event?: any, state?: any) => {
        if (!state) {
            ipcRenderer.invoke("show-rotate-dialog")
        } else {
            const newImages = await ipcRenderer.invoke("rotate", state)
            if (newImages) bulk ? setBulkFiles(newImages) : setImage(newImages[0])
        }
    }

    const flipX = async () => {
        const newImages = await ipcRenderer.invoke("flipX")
        if (newImages) bulk ? setBulkFiles(newImages) : setImage(newImages[0])
    }

    const flipY = async () => {
        const newImages = await ipcRenderer.invoke("flipY")
        if (newImages) bulk ? setBulkFiles(newImages) : setImage(newImages[0])
    }

    const undo = async () => {
        const newImages = await ipcRenderer.invoke("undo")
        if (newImages) bulk ? setBulkFiles(newImages) : setImage(newImages[0])
    }

    const redo = async () => {
        const newImages = await ipcRenderer.invoke("redo")
        if (newImages) bulk ? setBulkFiles(newImages) : setImage(newImages[0])
    }

    const save = async () => {
        if (bulk) {
            ipcRenderer.invoke("show-bulk-save-dialog")
        } else {
            let defaultPath = await ipcRenderer.invoke("get-original-images").then((r) => r[0])
            if (defaultPath.startsWith("data:") || defaultPath.startsWith("http")) {
                let name = null as any
                if (defaultPath.startsWith("data:")) {
                    const originalName = await ipcRenderer.invoke("get-original-name")
                    if (originalName) {
                        name = originalName
                    } else {
                        name = "image"
                    }
                } else {
                    name = path.basename(defaultPath)
                }
                defaultPath = `${app.getPath("downloads")}/${name}`
            }
            let savePath = await ipcRenderer.invoke("save-dialog", defaultPath)
            if (!savePath) return
            if (!path.extname(savePath)) savePath += path.extname(defaultPath)
            ipcRenderer.invoke("save-image", image, savePath)
        }
        
    }

    const reset = async () => {
        const newImages = await ipcRenderer.invoke("reset")
        if (newImages) bulk ? setBulkFiles(newImages) : setImage(newImages[0])
    }

    const previous = async () => {
        const previous = await ipcRenderer.invoke("previous")
        if (previous) {
            setImage(previous)
            ipcRenderer.invoke("update-original-images", previous)
            resetZoom()
            resetRotation()
            setBulk(false)
            setBulkFiles(null)
        }
    }

    const next = async () => {
        const next = await ipcRenderer.invoke("next")
        if (next) {
            setImage(next)
            ipcRenderer.invoke("update-original-images", next)
            resetZoom()
            resetRotation()
            setBulk(false)
            setBulkFiles(null)
        }
    }

    const resetZoom = () => {
        zoomRef?.current!.resetTransform(0)
    }

    const resetRotation = () => {
        setRotateDegrees(0)
    }

    const zoomIn = () => {
        zoomRef?.current!.zoomIn(0.5, 0)
    }

    const zoomOut = () => {
        zoomRef?.current!.zoomOut(0.5, 0)
    }

    const bulkProcess = async () => {
        const directory = await ipcRenderer.invoke("select-directory")
        if (!directory) return
        let files = fs.readdirSync(directory)
        files = files.filter((f) => imageExtensions.includes(path.extname(f))).map((f) => `${path.dirname(directory)}/${f}`)
        console.log(files)
        if (!files.length) return
        setBulkFiles(files)
        setBulk(true)
    }

    return (
        <main className="photo-viewer" {...getRootProps()}>
            <div className={hover ? "left-adjustment-bar visible" : "left-adjustment-bar"} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                <img className="adjustment-img" src={brightnessHover ? brightnessButtonHover : brightnessButton} onClick={() => brightness()} width={30} height={30} onMouseEnter={() => setBrightnessHover(true)} onMouseLeave={() => setBrightnessHover(false)}/>
                <img className="adjustment-img" src={hueHover ? hueButtonHover : hueButton} onClick={() => hue()} width={30} height={30} onMouseEnter={() => setHueHover(true)} onMouseLeave={() => setHueHover(false)}/>
                <img className="adjustment-img" src={tintHover ? tintButtonHover : tintButton} onClick={() => tint()} width={30} height={30} onMouseEnter={() => setTintHover(true)} onMouseLeave={() => setTintHover(false)}/>
                <img className="adjustment-img" src={blurHover ? blurButtonHover : blurButton} onClick={() => blur()} width={30} height={30} onMouseEnter={() => setBlurHover(true)} onMouseLeave={() => setBlurHover(false)}/>
                <img className="adjustment-img" src={previousHover ? previousButtonHover : previousButton} onClick={() => previous()} width={30} height={30} onMouseEnter={() => setPreviousHover(true)} onMouseLeave={() => setPreviousHover(false)}/>
                <img className="adjustment-img" src={pixelateHover ? pixelateButtonHover : pixelateButton} onClick={() => pixelate()} width={30} height={30} onMouseEnter={() => setPixelateHover(true)} onMouseLeave={() => setPixelateHover(false)}/>
                <img className="adjustment-img" src={invertHover ? invertButtonHover : invertButton} onClick={() => invert()} width={30} height={30} onMouseEnter={() => setInvertHover(true)} onMouseLeave={() => setInvertHover(false)}/>
                <img className="adjustment-img" src={binarizeHover ? binarizeButtonHover : binarizeButton} onClick={() => binarize()} width={30} height={30} onMouseEnter={() => setBinarizeHover(true)} onMouseLeave={() => setBinarizeHover(false)}/>
                <img className="adjustment-img" src={cropHover ? cropButtonHover : cropButton} onClick={() => toggleCrop()} width={30} height={30} onMouseEnter={() => setCropHover(true)} onMouseLeave={() => setCropHover(false)}/>
            </div>
            <div className={hover ? "right-adjustment-bar visible" : "right-adjustment-bar"} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                <img className="adjustment-img" src={resizeHover ? resizeButtonHover : resizeButton} onClick={() => resize()} width={30} height={30} onMouseEnter={() => setResizeHover(true)} onMouseLeave={() => setResizeHover(false)}/>
                <img className="adjustment-img" src={rotateHover ? rotateButtonHover : rotateButton} onClick={() => rotate()} width={30} height={30} onMouseEnter={() => setRotateHover(true)} onMouseLeave={() => setRotateHover(false)}/>
                <img className="adjustment-img" src={flipXHover ? flipXButtonHover : flipXButton} onClick={() => flipX()} width={30} height={30} onMouseEnter={() => setFlipXHover(true)} onMouseLeave={() => setFlipXHover(false)}/>
                <img className="adjustment-img" src={flipYHover ? flipYButtonHover : flipYButton} onClick={() => flipY()} width={30} height={30} onMouseEnter={() => setFlipYHover(true)} onMouseLeave={() => setFlipYHover(false)}/>
                <img className="adjustment-img" src={nextHover ? nextButtonHover : nextButton} onClick={() => next()} width={30} height={30} onMouseEnter={() => setNextHover(true)} onMouseLeave={() => setNextHover(false)}/>
                <img className="adjustment-img" src={undoHover ? undoButtonHover : undoButton} onClick={() => undo()} width={30} height={30} onMouseEnter={() => setUndoHover(true)} onMouseLeave={() => setUndoHover(false)}/>
                <img className="adjustment-img" src={redoHover ? redoButtonHover : redoButton} onClick={() => redo()} width={30} height={30} onMouseEnter={() => setRedoHover(true)} onMouseLeave={() => setRedoHover(false)}/>
                <img className="adjustment-img" src={saveHover ? saveButtonHover : saveButton} onClick={() => save()} width={30} height={30} onMouseEnter={() => setSaveHover(true)} onMouseLeave={() => setSaveHover(false)}/>
                <img className="adjustment-img" src={resetHover ? resetButtonHover : resetButton} onClick={() => reset()} width={30} height={30} onMouseEnter={() => setResetHover(true)} onMouseLeave={() => setResetHover(false)}/>
            </div>
            <TransformWrapper ref={zoomRef} minScale={0.5} limitToBounds={false} minPositionX={-200} maxPositionX={200} minPositionY={-200} maxPositionY={200} onZoomStop={(ref) => setZoomScale(ref.state.scale)} wheel={{step: 0.1}} pinch={{disabled: true}} zoomAnimation={{size: 0}} alignmentAnimation={{disabled: true}} doubleClick={{mode: "reset", animationTime: 0}}>
                <TransformComponent>
                    <div className="rotate-photo-container" style={{transform: `rotate(${rotateDegrees}deg)`}}>
                        {bulk ? <BulkContainer files={bulkFiles}/> :
                        <div className="photo-container">
                            <ReactCrop className="photo" src={image} zoom={zoomScale} spin={rotateDegrees} crop={cropState as any} onChange={(crop: any, percentCrop: any) => setCropState(percentCrop as any)} disabled={!cropEnabled} keepSelection={true}/>
                        </div>}
                    </div>
                </TransformComponent>
            </TransformWrapper>
        </main>
    )
}

export default PhotoViewer