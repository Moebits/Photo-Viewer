import {ipcRenderer, clipboard} from "electron"
import {getCurrentWindow, shell} from "@electron/remote"
import React, {useEffect, useState, useContext} from "react"
import closeButtonHover from "../assets/icons/close-hover.png"
import closeButton from "../assets/icons/close.png"
import appIcon from "../assets/icons/logo.png"
import maximizeButtonHover from "../assets/icons/maximize-hover.png"
import maximizeButton from "../assets/icons/maximize.png"
import minimizeButtonHover from "../assets/icons/minimize-hover.png"
import minimizeButton from "../assets/icons/minimize.png"
import starButtonHover from "../assets/icons/star-hover.png"
import starButton from "../assets/icons/star.png"
import updateButtonHover from "../assets/icons/updates-hover.png"
import updateButton from "../assets/icons/updates.png"
import uploadButton from "../assets/icons/upload.png"
import uploadButtonHover from "../assets/icons/upload-hover.png"
import linkButton from "../assets/icons/link.png"
import linkButtonHover from "../assets/icons/link-hover.png"
import pasteButton from "../assets/icons/paste.png"
import pasteButtonHover from "../assets/icons/paste-hover.png"
import darkButton from "../assets/icons/dark.png"
import darkButtonHover from "../assets/icons/dark-hover.png"
import lightButton from "../assets/icons/light.png"
import lightButtonHover from "../assets/icons/light-hover.png"
import cancelButton from "../assets/icons/cancel.png"
import cancelButtonHover from "../assets/icons/cancel-hover.png"
import acceptButton from "../assets/icons/accept.png"
import acceptButtonHover from "../assets/icons/accept-hover.png"
import gifButton from "../assets/icons/gif.png"
import gifButtonHover from "../assets/icons/gif-hover.png"
import hundredButton from "../assets/icons/100.png"
import hundredButtonHover from "../assets/icons/100-hover.png"
import bulkButton from "../assets/icons/bulk.png"
import bulkButtonHover from "../assets/icons/bulk-hover.png"
import squareButton from "../assets/icons/square.png"
import squareButtonHover from "../assets/icons/square-hover.png"
import {HoverContext} from "../renderer"
import pack from "../package.json"
import "../styles/titlebar.less"
import functions from "../structures/functions"

const TitleBar: React.FunctionComponent = (props) => {
    const {hover, setHover} = useContext(HoverContext)
    const [hoverClose, setHoverClose] = useState(false)
    const [hoverMin, setHoverMin] = useState(false)
    const [hoverMax, setHoverMax] = useState(false)
    const [hoverReload, setHoverReload] = useState(false)
    const [hoverStar, setHoverStar] = useState(false)
    const [hoverUpload, setHoverUpload] = useState(false)
    const [hoverLink, setHoverLink] = useState(false)
    const [hoverPaste, setHoverPaste] = useState(false)
    const [hoverTheme, setHoverTheme] = useState(false)
    const [hoverCancel, setHoverCancel] = useState(false)
    const [hoverAccept, setHoverAccept] = useState(false)
    const [hoverSquare, setHoverSquare] = useState(false)
    const [hoverGIF, setHoverGIF] = useState(false)
    const [hoverHundred, setHoverHundred] = useState(false)
    const [hoverBulk, setHoverBulk] = useState(false)
    const [theme, setTheme] = useState("light")
    const [acceptAction, setAcceptAction] = useState(null as any)

    useEffect(() => {
        ipcRenderer.invoke("check-for-updates", true)
        const initTheme = async () => {
            const saved = await ipcRenderer.invoke("get-theme")
            changeTheme(saved)
        }
        initTheme()
        const triggerAcceptAction = (event: any, action: string) => {
            setAcceptAction(action)
        }
        const clearAcceptAction = (event: any, action: string) => {
            setAcceptAction(null)
            setHoverCancel(false)
            setHoverAccept(false)
            setHoverSquare(false)
        }
        ipcRenderer.on("trigger-accept-action", triggerAcceptAction)
        ipcRenderer.on("clear-accept-action", clearAcceptAction)
        return () => {
            ipcRenderer.removeListener("trigger-accept-action", triggerAcceptAction)
            ipcRenderer.removeListener("clear-accept-action", clearAcceptAction)
        }
    }, [])

    const minimize = () => {
        getCurrentWindow().minimize()
    }

    const maximize = () => {
        const window = getCurrentWindow()
        if (window.isMaximized()) {
            window.unmaximize()
        } else {
            window.maximize()
        }
    }

    const close = () => {
        getCurrentWindow().close()
    }

    const star = () => {
        shell.openExternal(pack.repository.url)
    }

    const update = () => {
        ipcRenderer.invoke("check-for-updates", false)
    }

    const upload = () => {
        ipcRenderer.invoke("upload-file")
    }

    const link = () => {
        ipcRenderer.invoke("show-link-dialog")
    }

    const paste = () => {
        ipcRenderer.invoke("trigger-paste")
    }

    const changeTheme = (value?: string) => {
        let condition = value !== undefined ? value === "dark" : theme === "light"
        if (condition) {
            functions.updateTheme("dark")
            setTheme("dark")
            ipcRenderer.invoke("save-theme", "dark")
        } else {
            functions.updateTheme("light")
            setTheme("light")
            ipcRenderer.invoke("save-theme", "light")
        }
    }

    const triggerAction = (response: "accept" | "cancel" | "square") => {
        ipcRenderer.invoke("accept-action-response", acceptAction, response)
        if (response !== "square") setAcceptAction(null)
    }

    const gif = () => {
        ipcRenderer.invoke("show-gif-dialog")
    }

    const resetBounds = () => {
        ipcRenderer.invoke("reset-bounds")
    }

    const bulk = () => {
        ipcRenderer.invoke("bulk-process")
    }

    return (
        <section className={hover || process.platform === "win32" ? "title-bar visible" : "title-bar"}>
                <div className="title-bar-drag-area">
                    <div className="title-container">
                        <img className="app-icon" height="22" width="22" src={appIcon}/>
                        <p><span className="title">Photo Viewer v{pack.version}</span></p>
                    </div>
                    <div className="title-bar-buttons">
                        {acceptAction ? <>
                            <img src={hoverSquare ? squareButtonHover : squareButton} height="20" width="20" className="title-bar-button square-action-button" onClick={() => triggerAction("square")} onMouseEnter={() => setHoverSquare(true)} onMouseLeave={() => setHoverSquare(false)}/>
                        <img src={hoverCancel ? cancelButtonHover : cancelButton} height="20" width="20" className="title-bar-button cancel-action-button" onClick={() => triggerAction("cancel")} onMouseEnter={() => setHoverCancel(true)} onMouseLeave={() => setHoverCancel(false)}/>
                        <img src={hoverAccept ? acceptButtonHover : acceptButton} height="20" width="20" className="title-bar-button accept-action-button" onClick={() => triggerAction("accept")} onMouseEnter={() => setHoverAccept(true)} onMouseLeave={() => setHoverAccept(false)}/>
                        </> : null}
                        <img src={hoverTheme ? (theme === "light" ? darkButtonHover : lightButtonHover) : (theme === "light" ? darkButton : lightButton)} height="20" width="20" className="title-bar-button theme-button" onClick={() => changeTheme()} onMouseEnter={() => setHoverTheme(true)} onMouseLeave={() => setHoverTheme(false)}/>
                        {/*<img src={hoverBulk ? bulkButtonHover : bulkButton} height="20" width="20" className="title-bar-button bulk-button" onClick={bulk} onMouseEnter={() => setHoverBulk(true)} onMouseLeave={() => setHoverBulk(false)}/>*/}
                        {/*<img src={hoverHundred ? hundredButtonHover : hundredButton} height="20" width="20" className="title-bar-button hundred-button" onClick={resetBounds} onMouseEnter={() => setHoverHundred(true)} onMouseLeave={() => setHoverHundred(false)}/>*/}
                        <img src={hoverGIF ? gifButtonHover : gifButton} height="20" width="20" className="title-bar-button gif-button" onClick={gif} onMouseEnter={() => setHoverGIF(true)} onMouseLeave={() => setHoverGIF(false)}/>
                        <img src={hoverPaste ? pasteButtonHover : pasteButton} height="20" width="20" className="title-bar-button paste-button" onClick={paste} onMouseEnter={() => setHoverPaste(true)} onMouseLeave={() => setHoverPaste(false)}/>
                        <img src={hoverLink ? linkButtonHover : linkButton} height="20" width="20" className="title-bar-button link-button" onClick={link} onMouseEnter={() => setHoverLink(true)} onMouseLeave={() => setHoverLink(false)}/>
                        <img src={hoverUpload ? uploadButtonHover : uploadButton} height="20" width="20" className="title-bar-button upload-button" onClick={upload} onMouseEnter={() => setHoverUpload(true)} onMouseLeave={() => setHoverUpload(false)}/>
                        <img src={hoverStar ? starButtonHover : starButton} height="20" width="20" className="title-bar-button star-button" onClick={star} onMouseEnter={() => setHoverStar(true)} onMouseLeave={() => setHoverStar(false)}/>
                        <img src={hoverReload ? updateButtonHover : updateButton} height="20" width="20" className="title-bar-button update-button" onClick={update} onMouseEnter={() => setHoverReload(true)} onMouseLeave={() => setHoverReload(false)}/>
                        <img src={hoverMin ? minimizeButtonHover : minimizeButton} height="20" width="20" className="title-bar-button" onClick={minimize} onMouseEnter={() => setHoverMin(true)} onMouseLeave={() => setHoverMin(false)}/>
                        <img src={hoverMax ? maximizeButtonHover : maximizeButton} height="20" width="20" className="title-bar-button" onClick={maximize} onMouseEnter={() => setHoverMax(true)} onMouseLeave={() => setHoverMax(false)}/>
                        <img src={hoverClose ? closeButtonHover : closeButton} height="20" width="20" className="title-bar-button" onClick={close} onMouseEnter={() => setHoverClose(true)} onMouseLeave={() => setHoverClose(false)}/>
                    </div>
                </div>
        </section>
    )
}

export default TitleBar