import {ipcRenderer, remote} from "electron"
import Draggable from "react-draggable"
import React, {useEffect, useState, useRef} from "react"
import chain from "../assets/icons/chain.png"
import chainHover from "../assets/icons/chain-hover.png"
import chainTop from "../assets/icons/chainTop.png"
import chainBottom from "../assets/icons/chainBottom.png"
import "../styles/resizedialog.less"

const ResizeDialog: React.FunctionComponent = (props) => {
    const initialState = {
        width: 0,
        height: 0,
        originalWidth: 0,
        originalHeight: 0,
        link: true
    }
    const [state, setState] = useState(initialState)
    const [visible, setVisible] = useState(false)
    const [hover, setHover] = useState(false)
    const [hoverChain, setHoverChain] = useState(false)

    useEffect(() => {
        const showResizeDialog = (event: any) => {
            setVisible((prev) => {
                const newState = !prev
                if (newState === false) closeAndReset()
                if (newState === true) {
                    ipcRenderer.invoke("get-metadata").then((metadata: any) => {
                        setState((prev) => {
                            return {...prev, width: metadata.width, height: metadata.height, originalWidth: metadata.width, originalHeight: metadata.height}
                        })
                    })
                }
                return newState
            })
        }
        const closeAllDialogs = (event: any, ignore: any) => {
            if (ignore !== "resize") closeAndReset()
        }
        ipcRenderer.on("show-resize-dialog", showResizeDialog)
        ipcRenderer.on("close-all-dialogs", closeAllDialogs)
        return () => {
            ipcRenderer.removeListener("show-resize-dialog", showResizeDialog)
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

    const changeState = (type: string, newState: any) => {
        switch(type) {
            case "resize":
                setState((prev) => {
                    return {...prev, width: newState.width, height: newState.height}
                })
                ipcRenderer.invoke("apply-resize", {...state, width: newState.width, height: newState.height, realTime: true})
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
                ipcRenderer.invoke("apply-resize", state)
        }
        closeAndReset()
    }

    const changeWidth = (value?: number | string, newLink?: boolean) => {
        const width = value !== undefined ? Number(value) : state.width
        if (Number.isNaN(Number(width))) return
        let height = state.height
        const link = newLink !== undefined ? newLink : state.link
        if (link) {
            const ratio = (Number(width) / state.originalWidth)
            height = Math.round(Number(state.originalHeight) * ratio)
        }
        changeState("resize", {width, height})
    }

    const changeHeight = (value?: number | string, newLink?: boolean) => {
        const height = value !== undefined ? Number(value) : state.height
        if (Number.isNaN(Number(height))) return
        const link = newLink !== undefined ? newLink : state.link
        if (link) {
            return
        } else {
            const width = state.width
            changeState("resize", {width, height})
        }
    }

    const changeLink = () => {
        const newLink = !state.link
        setState((prev) => {
            return {...prev, link: newLink}
        })
        changeWidth(undefined, newLink)
        changeHeight(undefined, newLink)
    }

    const widthKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowUp") {
            changeWidth(state.width + 1)
        } else if (event.key === "ArrowDown") {
            if (state.width - 1 < 0) return
            changeWidth(state.width - 1)
        }
    }

    const heightKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowUp") {
            changeHeight(state.height + 1)
        } else if (event.key === "ArrowDown") {
            if (state.height - 1 < 0) return
            changeHeight(state.height - 1)
        }
    }

    if (visible) {
        return (
            <section className="resize-dialog" onMouseDown={close}>
                <Draggable handle=".resize-title-container">
                <div className="resize-dialog-box" onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                    <div className="resize-container">
                        <div className="resize-title-container">
                            <p className="resize-title">Resize</p>
                        </div>
                        <div className="resize-row-container">
                            <div className="resize-row">
                                <p className="resize-text">Width: </p>
                                <input className="resize-input" type="text" spellCheck="false" onChange={(event) => changeWidth(event.target.value)} value={state.width} onKeyDown={widthKey}/>
                            </div>
                            <div className="resize-row">
                                <p className="resize-text">Height: </p>
                                <input className="resize-input" type="text" spellCheck="false" onChange={(event) => changeHeight(event.target.value)} value={state.height} onKeyDown={heightKey}/>
                            </div>
                            <div className="resize-chain-container">
                                <img src={chainTop} className="resize-chain-top" style={state.link ? {opacity: 1} : {opacity: 0}}/>
                                <img src={hoverChain ? chainHover : chain} className="resize-chain" onClick={changeLink} onMouseEnter={() => setHoverChain(true)} onMouseLeave={() => setHoverChain(false)}/>
                                <img src={chainBottom} className="resize-chain-bottom" style={state.link ? {opacity: 1} : {opacity: 0}}/>
                            </div>
                        </div>
                        <div className="resize-button-container">
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

export default ResizeDialog