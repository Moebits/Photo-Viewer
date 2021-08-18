import {ipcRenderer, remote} from "electron"
import Draggable from "react-draggable"
import React, {useEffect, useState} from "react"
import "../styles/cropdialog.less"

const CropDialog: React.FunctionComponent = (props) => {
    const initialState = {
        x: 0 as any,
        y: 0 as any,
        width: 100 as any,
        height: 100 as any
    }
    const [state, setState] = useState(initialState)
    const [visible, setVisible] = useState(false)
    const [hover, setHover] = useState(false)

    useEffect(() => {
        const showCropDialog = (event: any) => {
            setVisible((prev) => {
                const newState = !prev
                if (newState === false) closeAndReset()
                return newState
            })
        }
        const closeAllDialogs = (event: any, ignore: any) => {
            if (ignore !== "crop") closeAndReset()
        }
        ipcRenderer.on("show-crop-dialog", showCropDialog)
        ipcRenderer.on("close-all-dialogs", closeAllDialogs)
        return () => {
            ipcRenderer.removeListener("show-crop-dialog", showCropDialog)
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

    const changeState = (type: string, value: any) => {
        switch(type) {
            case "x":
                setState((prev) => {
                    return {...prev, x: value}
                })
                ipcRenderer.invoke("apply-crop", {...state, x: value, realTime: true})
                break
            case "y":
                setState((prev) => {
                    return {...prev, y: value}
                })
                ipcRenderer.invoke("apply-crop", {...state, y: value, realTime: true})
                break
            case "width":
                setState((prev) => {
                    return {...prev, width: value}
                })
                ipcRenderer.invoke("apply-crop", {...state, width: value, realTime: true})
                break
            case "height":
                setState((prev) => {
                    return {...prev, height: value}
                })
                ipcRenderer.invoke("apply-crop", {...state, height: value, realTime: true})
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
                ipcRenderer.invoke("apply-crop", state)
        }
        closeAndReset(button === "accept")
    }

    const xKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowUp") {
            changeState("x", state.x + 1)
        } else if (event.key === "ArrowDown") {
            if (state.width - 1 < 0) return
            changeState("x", state.x - 1)
        }
    }

    const yKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowUp") {
            changeState("y", state.y + 1)
        } else if (event.key === "ArrowDown") {
            if (state.width - 1 < 0) return
            changeState("y", state.y - 1)
        }
    }

    const widthKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowUp") {
            changeState("width", state.width + 1)
        } else if (event.key === "ArrowDown") {
            if (state.width - 1 < 0) return
            changeState("width", state.width - 1)
        }
    }

    const heightKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowUp") {
            changeState("height", state.height + 1)
        } else if (event.key === "ArrowDown") {
            if (state.height - 1 < 0) return
            changeState("height", state.height - 1)
        }
    }

    if (visible) {
        return (
            <section className="crop-dialog" onMouseDown={close}>
                <Draggable handle=".crop-title-container">
                <div className="crop-dialog-box" onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                    <div className="crop-container">
                        <div className="crop-title-container">
                            <p className="crop-title">Bulk Crop</p>
                        </div>
                        <div className="crop-row-container">
                            <div className="crop-row">
                                <p className="crop-text">X %: </p>
                                <input className="crop-input" type="text" spellCheck="false" onChange={(event) => changeState("x", event.target.value)} value={state.x} onKeyDown={xKey}/>
                            </div>
                            <div className="crop-row">
                                <p className="crop-text">Y %: </p>
                                <input className="crop-input" type="text" spellCheck="false" onChange={(event) => changeState("y", event.target.value)} value={state.y} onKeyDown={yKey}/>
                            </div>
                            <div className="crop-row">
                                <p className="crop-text">Width %: </p>
                                <input className="crop-input" type="text" spellCheck="false" onChange={(event) => changeState("width", event.target.value)} value={state.width} onKeyDown={widthKey}/>
                            </div>
                            <div className="crop-row">
                                <p className="crop-text">Height %: </p>
                                <input className="crop-input" type="text" spellCheck="false" onChange={(event) => changeState("height", event.target.value)} value={state.height} onKeyDown={heightKey}/>
                            </div>
                        </div>
                        <div className="crop-button-container">
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

export default CropDialog