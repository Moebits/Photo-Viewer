import {ipcRenderer, remote} from "electron"
import Slider from "rc-slider"
import Draggable from "react-draggable"
import React, {useEffect, useState, useRef} from "react"
import "../styles/binarizedialog.less"

const BinarizeDialog: React.FunctionComponent = (props) => {
    const initialState = {
        binarize: 128
    }
    const [state, setState] = useState(initialState)
    const [visible, setVisible] = useState(false)
    const [hover, setHover] = useState(false)

    useEffect(() => {
        const showBinarizeDialog = (event: any) => {
            setVisible((prev) => {
                const newState = !prev
                if (newState === false) closeAndReset()
                if (newState === true) setTimeout(() => {ipcRenderer.invoke("apply-binarize", {...state, realTime: true})}, 100)
                return newState
            })
        }
        const closeAllDialogs = (event: any, ignore: any) => {
            if (ignore !== "binarize") closeAndReset()
        }
        ipcRenderer.on("show-binarize-dialog", showBinarizeDialog)
        ipcRenderer.on("close-all-dialogs", closeAllDialogs)
        return () => {
            ipcRenderer.removeListener("show-binarize-dialog", showBinarizeDialog)
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
            case "binarize":
                setState((prev) => {
                    return {...prev, binarize: value}
                })
                ipcRenderer.invoke("apply-binarize", {...state, binarize: value, realTime: true})
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
            ipcRenderer.invoke("apply-binarize", state)
        }
        closeAndReset()
    }

    if (visible) {
        return (
            <section className="binarize-dialog" onMouseDown={close}>
                <Draggable handle=".binarize-title-container">
                <div className="binarize-dialog-box" onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                    <div className="binarize-container">
                        <div className="binarize-title-container">
                            <p className="binarize-title">Binarize</p>
                        </div>
                        <div className="binarize-row-container">
                            <div className="binarize-row">
                                <p className="binarize-text">Threshold: </p>
                                <Slider className="binarize-slider" onChange={(value) => {changeState("binarize", value)}} min={1} max={255} step={1} value={state.binarize}/>
                            </div>
                        </div>
                        <div className="binarize-button-container">
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

export default BinarizeDialog