import {ipcRenderer} from "electron"
import React, {useEffect, useState, useRef, useContext} from "react"
import ReactDom from "react-dom"
import functions from "../structures/functions"
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
    const [hover, setHover] = useState(false)
    const [clickCounter, setClickCounter] = useState(2)

    useEffect(() => {
        ipcRenderer.invoke("get-gif-options").then((options) => {
            setState((prev) => {
                return {...prev, transparency: options.transparency, transparentColor: options.transparentColor, cumulative: options.cumulative}
            })
        })
        const initTheme = async () => {
            const theme = await ipcRenderer.invoke("get-theme")
            functions.updateTheme(theme)
        }
        initTheme()
        const updateTheme = (event: any, theme: string) => {
            functions.updateTheme(theme)
        }
        const clickCounter = () => {
            setClickCounter((prev) => prev + 1)
        }
        document.addEventListener("click", clickCounter)
        ipcRenderer.on("update-theme", updateTheme)
        return () => {
            ipcRenderer.removeListener("update-theme", updateTheme)
            document.removeEventListener("click", clickCounter)
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
        ipcRenderer.invoke("close-current-dialog")
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

    return (
        <section className="gif-dialog" onMouseDown={close}>
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
        </section>
    )
}

ReactDom.render(<GIFDialog/>, document.getElementById("root"))