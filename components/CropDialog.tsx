import {ipcRenderer} from "electron"
import React, {useEffect, useState, useRef, useContext} from "react"
import ReactDom from "react-dom"
import functions from "../structures/functions"
import "../styles/cropdialog.less"

const CropDialog: React.FunctionComponent = (props) => {
    const initialState = {
        x: 0 as any,
        y: 0 as any,
        width: 100 as any,
        height: 100 as any
    }
    const [state, setState] = useState(initialState)
    const [hover, setHover] = useState(false)

    useEffect(() => {
        const initTheme = async () => {
            const theme = await ipcRenderer.invoke("get-theme")
            const transparency = await ipcRenderer.invoke("get-transparency")
            functions.updateTheme(theme, transparency)
        }
        initTheme()
        const savedValues = async () => {
            const savedX = await ipcRenderer.invoke("get-temp", "x")
            const savedY = await ipcRenderer.invoke("get-temp", "y")
            const savedWidth = await ipcRenderer.invoke("get-temp", "width")
            const savedHeight = await ipcRenderer.invoke("get-temp", "height")
            if (savedX) changeState("x", Number(savedX))
            if (savedY) changeState("y", Number(savedY))
            if (savedWidth) changeState("width", Number(savedWidth))
            if (savedHeight) changeState("height", Number(savedHeight))
        }
        savedValues()
        const updateTheme = (event: any, theme: string, transparency: boolean) => {
            functions.updateTheme(theme, transparency)
        }
        ipcRenderer.on("update-theme", updateTheme)
        return () => {
            ipcRenderer.removeListener("update-theme", updateTheme)
        }
    }, [])

    useEffect(() => {
        const keyDown = async (event: globalThis.KeyboardEvent) => {
            if (event.key === "Enter") {
                enterPressed()
            }
            if (event.key === "Escape") {
                escapePressed()
            }
        }
        const enterPressed = () => {
            click("accept")
        }
        const escapePressed = () => {
            click("reject")
        }
        document.addEventListener("keydown", keyDown)
        ipcRenderer.on("enter-pressed", enterPressed)
        ipcRenderer.on("escape-pressed", escapePressed)
        return () => {
            document.removeEventListener("keydown", keyDown)
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
                ipcRenderer.invoke("save-temp", "x", String(value))
                break
            case "y":
                setState((prev) => {
                    return {...prev, y: value}
                })
                ipcRenderer.invoke("apply-crop", {...state, y: value, realTime: true})
                ipcRenderer.invoke("save-temp", "y", String(value))
                break
            case "width":
                setState((prev) => {
                    return {...prev, width: value}
                })
                ipcRenderer.invoke("apply-crop", {...state, width: value, realTime: true})
                ipcRenderer.invoke("save-temp", "width", String(value))
                break
            case "height":
                setState((prev) => {
                    return {...prev, height: value}
                })
                ipcRenderer.invoke("apply-crop", {...state, height: value, realTime: true})
                ipcRenderer.invoke("save-temp", "height", String(value))
                break
        }
    }

    const closeAndReset = async (noRevert?: boolean) => {
        if (!noRevert) await ipcRenderer.invoke("revert-to-last-state")
        await ipcRenderer.invoke("close-current-dialog")
        setState(initialState)
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

    return (
        <section className="crop-dialog" onMouseDown={close}>
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
        </section>
    )
}

ReactDom.render(<CropDialog/>, document.getElementById("root"))