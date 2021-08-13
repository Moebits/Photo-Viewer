import {ipcRenderer} from "electron"
import Slider from "rc-slider"
import Draggable from "react-draggable"
import React, {useEffect, useState} from "react"
import "../styles/hsldialog.less"

const HSLDialog: React.FunctionComponent = (props) => {
    const initialState = {
        hue: 0,
        saturation: 1,
        lightness: 1
    }
    const [state, setState] = useState(initialState)
    const [visible, setVisible] = useState(false)
    const [hover, setHover] = useState(false)

    useEffect(() => {
        const showHSLDialog = (event: any) => {
            setVisible((prev) => {
                const newState = !prev
                if (newState === false) closeAndReset()
                return newState
            })
        }
        const closeAllDialogs = (event: any, ignore: any) => {
            if (ignore !== "hsl") closeAndReset()
        }
        ipcRenderer.on("show-hsl-dialog", showHSLDialog)
        ipcRenderer.on("close-all-dialogs", closeAllDialogs)
        return () => {
            ipcRenderer.removeListener("show-hsl-dialog", showHSLDialog)
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
            case "hue":
                setState((prev) => {
                    return {...prev, hue: value}
                })
                ipcRenderer.invoke("apply-hsl", {...state, hue: value, realTime: true})
                break
            case "saturation":
                setState((prev) => {
                    return {...prev, saturation: value}
                })
                ipcRenderer.invoke("apply-hsl", {...state, saturation: value, realTime: true})
                break
            case "lightness":
                setState((prev) => {
                    return {...prev, lightness: value}
                })
                ipcRenderer.invoke("apply-hsl", {...state, lightness: value, realTime: true})
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
            ipcRenderer.invoke("apply-hsl", state)
        }
        closeAndReset()
    }

    if (visible) {
        return (
            <section className="hsl-dialog" onMouseDown={close}>
                <Draggable handle=".hsl-title-container">
                <div className="hsl-dialog-box" onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                    <div className="hsl-container">
                        <div className="hsl-title-container">
                            <p className="hsl-title">HSL Adjustment</p>
                        </div>
                        <div className="hsl-row-container">
                            <div className="hsl-row">
                                <p className="hsl-text">Hue: </p>
                                <Slider className="hsl-slider" onChange={(value) => {changeState("hue", value)}} min={-180} max={180} step={1} value={state.hue}/>
                            </div>
                            <div className="hsl-row">
                                <p className="hsl-text">Saturation: </p>
                                <Slider className="hsl-slider" onChange={(value) => {changeState("saturation", value)}} min={0.5} max={1.5} step={0.1} value={state.saturation}/>
                            </div>
                            <div className="hsl-row">
                                <p className="hsl-text">Lightness: </p>
                                <Slider className="hsl-slider" onChange={(value) => {changeState("lightness", value)}} min={0.5} max={1.5} step={0.1} value={state.lightness}/>
                            </div>
                        </div>
                        <div className="hsl-button-container">
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

export default HSLDialog