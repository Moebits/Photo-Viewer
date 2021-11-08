import {ipcRenderer} from "electron"
import Slider from "rc-slider"
import Draggable from "react-draggable"
import React, {useEffect, useState, useRef} from "react"
import "../styles/blurdialog.less"

const BlurDialog: React.FunctionComponent = (props) => {
    const initialState = {
        blur: 0.3,
        sharpen: 0.3
    }
    const [state, setState] = useState(initialState)
    const [visible, setVisible] = useState(false)
    const [hover, setHover] = useState(false)

    useEffect(() => {
        const showBlurDialog = (event: any) => {
            setVisible((prev) => {
                const newState = !prev
                if (newState === false) closeAndReset()
                return newState
            })
        }
        const closeAllDialogs = (event: any, ignore: any) => {
            if (ignore !== "blur") closeAndReset()
        }
        ipcRenderer.on("show-blur-dialog", showBlurDialog)
        ipcRenderer.on("close-all-dialogs", closeAllDialogs)
        return () => {
            ipcRenderer.removeListener("show-blur-dialog", showBlurDialog)
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
            case "blur":
                setState((prev) => {
                    return {...prev, blur: value}
                })
                ipcRenderer.invoke("apply-blur", {...state, blur: value, realTime: true})
                break
            case "sharpen":
                setState((prev) => {
                    return {...prev, sharpen: value}
                })
                ipcRenderer.invoke("apply-blur", {...state, sharpen: value, realTime: true})
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
            ipcRenderer.invoke("apply-blur", state)
        }
        closeAndReset(button === "accept")
    }

    if (visible) {
        return (
            <section className="blur-dialog" onMouseDown={close}>
                <Draggable handle=".blur-title-container">
                <div className="blur-dialog-box" onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                    <div className="blur-container">
                        <div className="blur-title-container">
                            <p className="blur-title">Blur and Sharpen</p>
                        </div>
                        <div className="blur-row-container">
                            <div className="blur-row">
                                <p className="blur-text">Blur: </p>
                                <Slider className="blur-slider" onChange={(value) => {changeState("blur", value)}} min={0.3} max={15} step={0.1} value={state.blur}/>
                            </div>
                            <div className="blur-row">
                                <p className="blur-text">Sharpen: </p>
                                <Slider className="blur-slider" onChange={(value) => {changeState("sharpen", value)}} min={0.3} max={15} step={0.1} value={state.sharpen}/>
                            </div>
                        </div>
                        <div className="blur-button-container">
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

export default BlurDialog