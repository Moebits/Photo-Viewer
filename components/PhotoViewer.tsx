import React, {useEffect, useState} from "react"
import {ipcRenderer, clipboard, nativeImage, remote, KeyboardEvent} from "electron" 
import ReactCrop from "react-image-crop"
import path from "path"
import noImage from "../assets/images/noimage.png"
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
import "react-image-crop/dist/ReactCrop.css"
import "../styles/photoviewer.less"

const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".tiff", ".gif"]

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

    useEffect(() => {
        const getOpenedFile = async () => {
            const file = await ipcRenderer.invoke("get-opened-file")
            if (imageExtensions.includes(path.extname(file))) {
                upload (file)
            } else {
                setImage(noImage)
            }
        }
        ipcRenderer.invoke("update-original-image", image)
        getOpenedFile()
        const openFile = (event: any, file: string) => {
            if (file) upload(file)
        }
        const uploadFile = (event: any) => {
            upload()
        }
        const openLink = (event: any, link: string) => {
            if (link) {
                setImage(link)
                ipcRenderer.invoke("update-original-image", link)
                ipcRenderer.invoke("set-original-name", null)
            }
        }
        const triggerPaste = () => {
            const img = clipboard.readImage()
            if (img.isEmpty()) return
            const base64 = functions.bufferToBase64(img.toPNG(), "png")
            setImage(base64)
            ipcRenderer.invoke("update-original-image", base64)
            ipcRenderer.invoke("set-original-name", null)
        }
        const updateImage = (event: any, base64: string) => {
            if (base64) setImage(base64)
        }
        const triggerUndo = () => {
            undo()
        }
        const triggerRedo = () => {
            redo()
        }
        ipcRenderer.on("open-file", openFile)
        ipcRenderer.on("open-link", openLink)
        ipcRenderer.on("upload-file", uploadFile)
        ipcRenderer.on("trigger-paste", triggerPaste)
        ipcRenderer.on("update-image", updateImage)
        ipcRenderer.on("apply-brightness", brightness)
        ipcRenderer.on("apply-hsl", hue)
        ipcRenderer.on("apply-tint", tint)
        ipcRenderer.on("apply-blur", blur)
        ipcRenderer.on("apply-pixelate", pixelate)
        ipcRenderer.on("apply-resize", resize)
        ipcRenderer.on("apply-rotate", rotate)
        ipcRenderer.on("apply-binarize", binarize)
        ipcRenderer.on("trigger-undo", triggerUndo)
        ipcRenderer.on("trigger-redo", triggerRedo)
        return () => {
            ipcRenderer.removeListener("open-file", openFile)
            ipcRenderer.removeListener("upload-file", openFile)
            ipcRenderer.removeListener("open-link", openLink)
            ipcRenderer.removeListener("trigger-paste", triggerPaste)
            ipcRenderer.removeListener("update-image", updateImage)
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
        }
    }, [])

    useEffect(() => {
        const copyImage = () => {
            if (image.startsWith("data:")) {
                clipboard.writeImage(nativeImage.createFromBuffer(functions.base64ToBuffer(image)))
            } else {
                clipboard.writeImage(nativeImage.createFromPath(image))
            }
        }
        const copyAddress = () => {
            clipboard.writeText(image)
        }
        ipcRenderer.on("copy-image", copyImage)
        ipcRenderer.on("copy-address", copyAddress)
        ipcRenderer.on("save-img-context", save)
        return () => {
            ipcRenderer.removeListener("copy-image", copyImage)
            ipcRenderer.removeListener("copy-address", copyAddress)
            ipcRenderer.removeListener("save-img-context", save)
        }
    }, [image])

    useEffect(() => {
        const crop = async (response: "accept" | "cancel") => {
            if (response === "accept") {
                const newImage = await ipcRenderer.invoke("crop", cropState)
                if (newImage) setImage(newImage)
            }
            toggleCrop(false)
        }
        const acceptActionResponse = (event: any, action: string, response: "accept" | "cancel") => {
            if (action === "crop") {
                crop(response)
            }
        }
        const keyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key === "Enter") {
                if (cropEnabled) crop("accept")
                ipcRenderer.invoke("enter-pressed")
            }
            if (event.key === "Escape") {
                if (cropEnabled) crop("cancel")
                ipcRenderer.invoke("escape-pressed")
            }
        }
        ipcRenderer.on("accept-action-response", acceptActionResponse)
        document.addEventListener("keydown", keyDown)
        return () => {
            ipcRenderer.removeListener("accept-action-response", acceptActionResponse)
            document.removeEventListener("keydown", keyDown)
        }
    })

    const upload = async (file?: string) => {
        if (!file) file = await ipcRenderer.invoke("select-file")
        if (!file) return
        if (!imageExtensions.includes(path.extname(file))) return
        let newImg = file
        if (path.extname(file) === ".tiff") {
            newImg = await ipcRenderer.invoke("tiff-to-png", file)
            ipcRenderer.invoke("set-original-name", path.basename(file, path.extname(file)))
        }
        setImage(newImg)
        ipcRenderer.invoke("update-original-image", newImg)
    }

    const brightness = async (event?: any, state?: any) => {
        if (!state) {
            ipcRenderer.invoke("show-brightness-dialog")
        } else {
            const newImage = await ipcRenderer.invoke("brightness", state)
            if (newImage) setImage(newImage)
        }
    }

    const hue = async (event?: any, state?: any) => {
        if (!state) {
            ipcRenderer.invoke("show-hsl-dialog")
        } else {
            const newImage = await ipcRenderer.invoke("hsl", state)
            if (newImage) setImage(newImage)
        }
    }

    const tint = async (event?: any, state?: any) => {
        if (!state) {
            ipcRenderer.invoke("show-tint-dialog")
        } else {
            const newImage = await ipcRenderer.invoke("tint", state)
            if (newImage) setImage(newImage)
        }
    }

    const blur = async (event?: any, state?: any) => {
        if (!state) {
            ipcRenderer.invoke("show-blur-dialog")
        } else {
            const newImage = await ipcRenderer.invoke("blur", state)
            if (newImage) setImage(newImage)
        }
    }

    const pixelate = async (event?: any, state?: any) => {
        if (!state) {
            ipcRenderer.invoke("show-pixelate-dialog")
        } else {
            const newImage = await ipcRenderer.invoke("pixelate", state)
            if (newImage) setImage(newImage)
        }
    }

    const invert = async () => {
        const newImage = await ipcRenderer.invoke("invert", image)
        if (newImage) setImage(newImage)
    }

    const binarize = async (event?: any, state?: any) => {
        if (!state) {
            ipcRenderer.invoke("show-binarize-dialog")
        } else {
            const newImage = await ipcRenderer.invoke("binarize", state)
            if (newImage) setImage(newImage)
        }
    }

    const toggleCrop = (value?: boolean) => {
        let newState = value !== undefined ? value : !cropEnabled
        if (newState === true) {
            const selection = document.querySelector(".ReactCrop__crop-selection") as HTMLDivElement
            selection.style.opacity = "1"
            setCropState((prev) => {
                return {...prev, x: 0, y: 0, width: 100, height: 100}
            })
            setCropEnabled(true)
            ipcRenderer.invoke("trigger-accept-action", "crop")
        } else {
            const selection = document.querySelector(".ReactCrop__crop-selection") as HTMLDivElement
            selection.style.opacity = "0"
            setCropEnabled(false)
            ipcRenderer.invoke("clear-accept-action")
        }
    }

    const resize = async (event?: any, state?: any) => {
        if (!state) {
            ipcRenderer.invoke("show-resize-dialog")
        } else {
            const newImage = await ipcRenderer.invoke("resize", state)
            if (newImage) setImage(newImage)
        }
    }

    const rotate = async (event?: any, state?: any) => {
        if (!state) {
            ipcRenderer.invoke("show-rotate-dialog")
        } else {
            const newImage = await ipcRenderer.invoke("rotate", state)
            if (newImage) setImage(newImage)
        }
    }

    const flipX = async () => {
        const newImage = await ipcRenderer.invoke("flipX", image)
        if (newImage) setImage(newImage)
    }

    const flipY = async () => {
        const newImage = await ipcRenderer.invoke("flipY", image)
        if (newImage) setImage(newImage)
    }

    const undo = async () => {
        const newImage = await ipcRenderer.invoke("undo")
        if (newImage) setImage(newImage)
    }

    const redo = async () => {
        const newImage = await ipcRenderer.invoke("redo")
        if (newImage) setImage(newImage)
    }

    const save = async () => {
        let defaultPath = await ipcRenderer.invoke("get-original-image")
        if (!defaultPath.startsWith("file:///")) {
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
            defaultPath = `${remote.app.getPath("downloads")}/${name}`
        }
        let savePath = await ipcRenderer.invoke("save-dialog", defaultPath)
        if (!savePath) return
        if (!path.extname(savePath)) savePath += path.extname(defaultPath)
        ipcRenderer.invoke("save-image", image, savePath)
    }

    const reset = async () => {
        const newImage = await ipcRenderer.invoke("reset")
        if (newImage) setImage(newImage)
    }

    const previous = async () => {
        const previous = await ipcRenderer.invoke("previous")
        if (previous) {
            setImage(previous)
            ipcRenderer.invoke("update-original-image", previous)
        }
    }

    const next = async () => {
        const next = await ipcRenderer.invoke("next")
        if (next) {
            setImage(next)
            ipcRenderer.invoke("update-original-image", next)
        }
    }

    return (
        <main className="photo-viewer">
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
            <div className="photo-container">
                <ReactCrop className="photo" src={image} crop={cropState as any} onChange={(crop, percentCrop) => setCropState(percentCrop as any)} disabled={!cropEnabled} keepSelection={true}/>
            </div>
        </main>
    )
}

export default PhotoViewer