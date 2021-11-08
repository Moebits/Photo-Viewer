import {ipcRenderer} from "electron"
import Draggable from "react-draggable"
import React, {useEffect, useState} from "react"
import "../styles/infodialog.less"
import functions from "../structures/functions"

const InfoDialog: React.FunctionComponent = (props) => {
    const initialState = {
        name: null,
        width: 0,
        height: 0,
        format: null,
        size: 0 as any,
        dpi: 0,
        frames: 0,
        space: null
    }
    const [state, setState] = useState(initialState)
    const [visible, setVisible] = useState(false)
    const [hover, setHover] = useState(false)

    useEffect(() => {
        const showinfoDialog = (event: any, image: string) => {
            setVisible(() => {
                ipcRenderer.invoke("get-metadata").then((info) => {
                    if (info.length > 1) {
                        console.log(info)
                        console.log(image)
                        const i = info.findIndex((i: any) => functions.pathEqual(i.image, image))
                        if (i === -1) return close()
                        setState((prev) => {
                            return {...prev, name: info[i].name, width: info[i].width, height: info[i].height, format: info[i].format, size: info[i].size, dpi: info[i].dpi, frames: info[i].frames, space: info[i].space}
                        })
                    } else {
                        setState((prev) => {
                            return {...prev, name: info[0].name, width: info[0].width, height: info[0].height, format: info[0].format, size: info[0].size, dpi: info[0].dpi, frames: info[0].frames, space: info[0].space}
                        })
                    }
                })
                return true
            })
        }
        const closeAllDialogs = (event: any, ignore: any) => {
            if (ignore !== "info") close()
        }
        ipcRenderer.on("show-info-dialog", showinfoDialog)
        ipcRenderer.on("close-all-dialogs", closeAllDialogs)
        return () => {
            ipcRenderer.removeListener("show-info-dialog", showinfoDialog)
            ipcRenderer.removeListener("close-all-dialogs", closeAllDialogs)
        }
    }, [])

    const close = () => {
        if (!hover) {
            setVisible(false)
            setState(initialState)
        }
    }

    if (visible) {
        return (
            <section className="info-dialog" onMouseDown={close}>
                <Draggable>
                <div className="info-dialog-box" onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                    <div className="info-container">
                        <div className="info-title-container">
                            <p className="info-title">Image Info</p>
                        </div>
                        <div className="info-row-container">
                            <div className="info-row">
                                <p className="info-text">Name: </p>
                                <p className="info-text-alt">{state.name}</p>
                            </div>
                            <div className="info-row">
                                <p className="info-text">Width: </p>
                                <p className="info-text-alt">{state.width}</p>
                            </div>
                            <div className="info-row">
                                <p className="info-text">Height: </p>
                                <p className="info-text-alt">{state.height}</p>
                            </div>
                            <div className="info-row">
                                <p className="info-text">DPI: </p>
                                <p className="info-text-alt">{state.dpi}</p>
                            </div>
                            <div className="info-row">
                                <p className="info-text">Size: </p>
                                <p className="info-text-alt">{state.size === "?" ? "?" : functions.readableFileSize(state.size)}</p>
                            </div>
                            <div className="info-row">
                                <p className="info-text">Format: </p>
                                <p className="info-text-alt">{state.format}</p>
                            </div>
                            <div className="info-row">
                                <p className="info-text">Frames: </p>
                                <p className="info-text-alt">{state.frames}</p>
                            </div>
                            <div className="info-row">
                                <p className="info-text">Color Space: </p>
                                <p className="info-text-alt">{state.space}</p>
                            </div>
                        </div>
                    </div>
                </div>
                </Draggable>
            </section>
        )
    }
    return null
}

export default InfoDialog