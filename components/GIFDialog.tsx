import {ipcRenderer} from "electron"
import Draggable from "react-draggable"
import React, {useEffect, useState, useRef} from "react"
import checkbox from "../assets/icons/checkbox.png"
import checkboxChecked from "../assets/icons/checkbox-checked.png"
import "../styles/gifdialog.less"

const GIFDialog: React.FunctionComponent = (props) => {
    const initialState = {
        speed: 1,
        reverse: false,
        transparency: false,
        transparentColor: "#000000",
        cumulative: true
    }
    const [state, setState] = useState(initialState)
    const [visible, setVisible] = useState(false)
    const [hover, setHover] = useState(false)
    const [clickCounter, setClickCounter] = useState(2)

    useEffect(() => {
        const showGIFDialog = (event: any) => {
            setVisible((prev) => {
                const newState = !prev
                if (newState === false) closeAndReset()
                if (newState === true) {
                    ipcRenderer.invoke("get-gif-options").then((options) => {
                        setState((prev) => {
                            return {...prev, transparency: options.transparency, transparentColor: options.transparentColor, cumulative: options.cumulative}
                        })
                    })
                }
                return newState
            })
        }
        const closeAllDialogs = (event: any, ignore: any) => {
            if (ignore !== "gif") closeAndReset()
        }
        const clickCounter = () => {
            setClickCounter((prev) => prev + 1)
        }
        document.addEventListener("click", clickCounter)
        ipcRenderer.on("show-gif-dialog", showGIFDialog)
        ipcRenderer.on("close-all-dialogs", closeAllDialogs)
        return () => {
            ipcRenderer.removeListener("show-gif-dialog", showGIFDialog)
            ipcRenderer.removeListener("close-all-dialogs", closeAllDialogs)
            document.removeEventListener("click", clickCounter)
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
            case "speed":
                setState((prev) => {
                    return {...prev, speed: value}
                })
                break
            case "reverse":
                setState((prev) => {
                    return {...prev, reverse: value}
                })
                break
            case "transparency":
                setState((prev) => {
                    return {...prev, transparency: value}
                })
                break
            case "transparentColor":
                setState((prev) => {
                    return {...prev, transparentColor: value}
                })
                break
            case "cumulative":
                setState((prev) => {
                    return {...prev, cumulative: value}
                })
                break
        }
    }

    const closeAndReset = () => {
        setVisible(false)
        setState(initialState)
    }
    
    const close = () => {
        setTimeout(() => {
            if (!hover && clickCounter > 1) {
                ipcRenderer.invoke("set-gif-options", state)
                closeAndReset()
            }
        }, 100)
    }

    const click = (button: "accept" | "reject") => {
        if (button === "accept") {
            ipcRenderer.invoke("gif-effects", state)
        }
        ipcRenderer.invoke("set-gif-options", state)
        closeAndReset()
    }

    const speedKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowUp") {
            let speed = Number(state.speed) + 1
            changeState("speed", speed)
        } else if (event.key === "ArrowDown") {
            let speed = Number(state.speed) - 1
            if (speed < 0.1) speed = 0.1
            changeState("speed", speed)
        }
    }

    if (visible) {
        return (
            <section className="gif-dialog" onMouseDown={close}>
                <Draggable handle=".gif-title-container">
                <div className="gif-dialog-box" onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                    <div className="gif-container">
                        <div className="gif-title-container">
                            <p className="gif-title">GIF Options</p>
                        </div>
                        <div className="gif-row-container">
                            <div className="gif-row">
                                <p className="gif-text">Speed: </p>
                                <input className="gif-input" type="text" spellCheck="false" onChange={(event) => changeState("speed", event.target.value)} value={state.speed} onKeyDown={speedKey}/>
                            </div>
                            <div className="gif-row">
                                <p className="gif-text">Reverse: </p>
                                <div className="gif-checkbox-container">
                                    <img className="gif-checkbox" src={state.reverse ? checkboxChecked : checkbox} width={12} height={12} onClick={() => changeState("reverse", !state.reverse)}/>
                                </div>
                            </div>
                            <div className="gif-row">
                                <p className="gif-text">Transparency: </p>
                                <div className="gif-checkbox-container">
                                    <img className="gif-checkbox" src={state.transparency ? checkboxChecked : checkbox} width={12} height={12} onClick={() => changeState("transparency", !state.transparency)}/>
                                </div>
                            </div>
                            <div className="gif-row">
                                <p className="gif-text">Transparent Color: </p>   
                                <input type="color" className="gif-color-box" onChange={(event) => changeState("transparentColor", event.target.value)} onClick={() => setClickCounter(0)} value={state.transparentColor}></input>
                            </div>
                            <div className="gif-row">
                                <p className="gif-text">Cumulative: </p>
                                <div className="gif-checkbox-container">
                                    <img className="gif-checkbox" src={state.cumulative ? checkboxChecked : checkbox} width={12} height={12} onClick={() => changeState("cumulative", !state.cumulative)}/>
                                </div>
                            </div>
                        </div>
                        <div className="gif-button-container">
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

export default GIFDialog