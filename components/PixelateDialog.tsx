import {ipcRenderer, remote} from "electron"
import Slider from "rc-slider"
import Draggable from "react-draggable"
import React, {useEffect, useState, useRef} from "react"
import "../styles/pixelatedialog.less"

const PixelateDialog: React.FunctionComponent = (props) => {
    const initialState = {
        strength: 1
    }
    const [state, setState] = useState(initialState)
    const [visible, setVisible] = useState(false)
    const [hover, setHover] = useState(false)

    useEffect(() => {
        const showPixelateDialog = (event: any) => {
            setVisible((prev) => {
                const newState = !prev
                if (newState === false) closeAndReset()
                return newState
            })
        }
        const closeAllDialogs = (event: any, ignore: any) => {
            if (ignore !== "pixelate") closeAndReset()
        }
        ipcRenderer.on("show-pixelate-dialog", showPixelateDialog)
        ipcRenderer.on("close-all-dialogs", closeAllDialogs)
        return () => {
            ipcRenderer.removeListener("show-pixelate-dialog", showPixelateDialog)
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
            case "strength":
                setState((prev) => {
                    return {...prev, strength: value}
                })
                ipcRenderer.invoke("apply-pixelate", {...state, strength: value, realTime: true})
                break
        }
    }

    const closeAndReset = () => {
        setVisible(false)
        setState(initialState)
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
            ipcRenderer.invoke("apply-pixelate", state)
        }
        closeAndReset()
    }

    if (visible) {
        return (
            <section className="pixelate-dialog" onMouseDown={close}>
                <Draggable handle=".pixelate-title-container">
                <div className="pixelate-dialog-box" onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                    <div className="pixelate-container">
                        <div className="pixelate-title-container">
                            <p className="pixelate-title">Pixelate</p>
                        </div>
                        <div className="pixelate-row-container">
                            <div className="pixelate-row">
                                <p className="pixelate-text">Strength: </p>
                                <Slider className="pixelate-slider" onChange={(value) => {changeState("strength", value)}} min={1} max={50} step={1} value={state.strength}/>
                            </div>
                        </div>
                        <div className="pixelate-button-container">
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

export default PixelateDialog