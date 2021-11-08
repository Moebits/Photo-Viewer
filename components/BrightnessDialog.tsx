import {ipcRenderer} from "electron"
import Slider from "rc-slider"
import Draggable from "react-draggable"
import React, {useEffect, useState, useRef} from "react"
import "../styles/brightnessdialog.less"

const BrightnessDialog: React.FunctionComponent = (props) => {
    const initialState = {
        brightness: 1,
        contrast: 1
    }
    const [state, setState] = useState(initialState)
    const [visible, setVisible] = useState(false)
    const [hover, setHover] = useState(false)

    useEffect(() => {
        const showBrightnessDialog = (event: any) => {
            setVisible((prev) => {
                const newState = !prev
                if (newState === false) closeAndReset()
                return newState
            })
        }
        const closeAllDialogs = (event: any, ignore: any) => {
            if (ignore !== "brightness") closeAndReset()
        }
        ipcRenderer.on("show-brightness-dialog", showBrightnessDialog)
        ipcRenderer.on("close-all-dialogs", closeAllDialogs)
        return () => {
            ipcRenderer.removeListener("show-brightness-dialog", showBrightnessDialog)
            ipcRenderer.removeListener("close-all-dialogs", closeAllDialogs)
        }
    }, [])

    useEffect(() => {
        const enterPressed = () => {
            if (visible) click("accept")
        }
        const escapePressed = () => {
            if (visible) click("reject")
        }
        ipcRenderer.on("enter-pressed", enterPressed)
        ipcRenderer.on("escape-pressed", escapePressed)
        return () => {
            ipcRenderer.removeListener("enter-pressed", enterPressed)
            ipcRenderer.removeListener("escape-pressed", escapePressed)
        }
    })
    
    const changeState = (type: string, value: number) => {
        switch(type) {
            case "brightness":
                setState((prev) => {
                    return {...prev, brightness: value}
                })
                ipcRenderer.invoke("apply-brightness", {...state, brightness: value, realTime: true})
                break
            case "contrast":
                setState((prev) => {
                    return {...prev, contrast: value}
                })
                ipcRenderer.invoke("apply-brightness", {...state, contrast: value, realTime: true})
                break
        }
    }

    const closeAndReset = (noRevert?: boolean) => {
        setVisible(false)
        setState(initialState)
        if (noRevert) return
        setTimeout(() => {
            ipcRenderer.invoke("revert-to-last-state")
        }, 100)
    }
    
    const close = () => {
        setTimeout(() => {
            if (!hover) closeAndReset()
        }, 100)
    }

    const click = (button: "accept" | "reject") => {
        if (button === "accept") {
            ipcRenderer.invoke("apply-brightness", state)
        }
        closeAndReset(button === "accept")
    }

    if (visible) {
        return (
            <section className="brightness-dialog" onMouseDown={close}>
                <Draggable handle=".brightness-title-container">
                <div className="brightness-dialog-box" onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                    <div className="brightness-container">
                        <div className="brightness-title-container">
                            <p className="brightness-title">Brightness and Contrast</p>
                        </div>
                        <div className="brightness-row-container">
                            <div className="brightness-row">
                                <p className="brightness-text">Brightness: </p>
                                <Slider className="brightness-slider" onChange={(value) => {changeState("brightness", value)}} min={0.5} max={1.5} step={0.1} value={state.brightness}/>
                            </div>
                            <div className="brightness-row">
                                <p className="brightness-text">Contrast: </p>
                                <Slider className="brightness-slider" onChange={(value) => {changeState("contrast", value)}} min={0.5} max={1.5} step={0.1} value={state.contrast}/>
                            </div>
                        </div>
                        <div className="brightness-button-container">
                            <button onClick={() => click("reject")} className="reject-button">{"Cancel"}</button>
                            <button onClick={() => click("accept")} className="accept-button">{"Ok"}</button>
                        </div>
                    </div>
                </div>
                </Draggable>
            </section>
        )
    }
    return null
}

export default BrightnessDialog