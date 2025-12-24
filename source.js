const map = document.getElementById("mainMapImg")
const mapDiv = map.parentElement
const containerMain = mapDiv.parentElement
const legendDiv = document.getElementById("legend")
let mapAspect = 2
let mapScale = 1
let currMapIndex = 0
let currMapAmnt = 1
let currMapId = "dawn"
let currMapInfo = null
let defMarkerSize = 14
let markerSize = defMarkerSize
const defMarkColor = [255,0,0]

async function getBaseMarkerInfo() {
    let res = await fetch("./markerInfo.json").then(response => response.json())
    return res
}
async function getMapInfo() {
    let res = await fetch("./mapInfo.json").then(response=>response.json())
    return res
}
let baseMarkerInfo = getBaseMarkerInfo()
let allMapInfo = getMapInfo()
let currLoadedMarkers = []

//just use this variable to determine whether "size" in calculateXYsize means in respect to the smallest or biggest dimension
//thats to say, if the variable is true, then 1 unit of size will correspond to 100% of the smallest dimension, be it width or height
//if the variable is false, 1 unit of size will correspond to 100% of the biggest dimension, be it width or height
let scaleSmallest = true
function calculateXYSize(element,size,aspect=1) {
    const parent = element.parentElement ? element.parentElement : document.documentElement
    const parentRect = parent.getBoundingClientRect()
    let parentWidth = parentRect.right-parentRect.left
    let parentHeight = parentRect.bottom-parentRect.top
    let sizePxX = 0
    let sizePxY = 0
    parentWidth = aspect > 1 ? parentWidth/aspect : parentWidth
    parentHeight = aspect < 1 ? parentHeight*aspect : parentHeight
    let sizePx
    if (scaleSmallest == true) {
        sizePx = parentWidth > parentHeight ? parentHeight : parentWidth
    } else {
        sizePx = parentWidth < parentHeight ? parentHeight : parentWidth
    }
    if (aspect > 1) { //wider
        sizePxX = sizePx*aspect*size
        sizePxY = sizePx*size
    } else { //taller
        sizePxY = sizePx/aspect*size
        sizePxX = sizePx*size
    }
    element.style.height = sizePxY.toString()+"px"
    element.style.width = sizePxX.toString()+"px"
}

let scrollLeft = document.getElementById("scrollLeft")
let scrollRight = document.getElementById("scrollRight")
function refreshScrollVisibility() {
    scrollLeft.style.opacity = 1
    scrollLeft.style.cursor = "pointer"
    scrollRight.style.opacity = 1
    scrollRight.style.cursor = "pointer"

    if (currMapIndex <= 0) {
        scrollLeft.style.cursor = "default"
        scrollLeft.style.opacity = 0
    }
    if (currMapIndex >= currMapAmnt-1) {
        scrollRight.style.cursor = "default"
        scrollRight.style.opacity = 0
    }
    let currRectLeft = scrollLeft.getBoundingClientRect()
    let currWidthLeft = currRectLeft.right-currRectLeft.left
    let currRectRight = scrollRight.getBoundingClientRect()
    let currWidthRight = currRectRight.right-currRectRight.left
    scrollLeft.style.fontSize = currWidthLeft.toString()+"px"
    scrollRight.style.fontSize = currWidthRight.toString()+"px"
}

scrollLeft.onmouseup = (mouseEvent) => {
    if (mouseEvent.button != 0) {
        return
    }
    if (scrollLeft.style.opacity == 0) {
        return
    }
    loadMapIdIndex(currMapId,currMapIndex-1)
}

scrollRight.onmouseup = (mouseEvent) => {
    if (mouseEvent.button != 0) {
        return
    }
    if (scrollRight.style.opacity == 0) {
        return
    }
    loadMapIdIndex(currMapId,currMapIndex+1)
}


let cursorNoteDiv = document.createElement("div")
cursorNoteDiv.classList = "mrkNote"
let currHoveredMarker = null
let mouseXY = []
document.onmousemove = (mouseEvent) => {
    mouseXY = [mouseEvent.clientX,mouseEvent.clientY]
    if (currHoveredMarker != null) {
        updateCursorNote()
    }
}

function updateCursorNote() {
    cursorNoteDiv.style.left = (mouseXY[0]+20).toString()+"px"
    cursorNoteDiv.style.top = mouseXY[1].toString()+"px"
    cursorNoteDiv.style.color = "rgb("+currHoveredMarker.color.join(",")+")"
    let innerText = currHoveredMarker.legend
    if (currHoveredMarker.amnt) {
        innerText += " ("+currHoveredMarker.amnt.toString()+")"
    }
    if (currHoveredMarker.note) {
        innerText += "\n"+currHoveredMarker.note
    }
    cursorNoteDiv.innerText = innerText
}

function showCursorNote(markerInfo) {
    currHoveredMarker = markerInfo
    document.getElementById("body").appendChild(cursorNoteDiv)
    updateCursorNote()
}

function hideCursorNote() {
    currHoveredMarker = null
    cursorNoteDiv.remove()
}

function refreshExistingMarkers() {
    currLoadedMarkers.forEach(markContainer => {
        markerElement = markContainer.element
        markerInfo = markContainer.markerInfo
        markerElement.style.top = (markerInfo.Y*100).toString()+"%"
        markerElement.style.left = (markerInfo.X*100).toString()+"%"

        let markSizeCalc
        if (scaleSmallest == true) {
            markSizeCalc = currMapInfo.sizeX < currMapInfo.sizeY ? markerSize/currMapInfo.sizeX : markerSize/currMapInfo.sizeY
        } else {
            markSizeCalc = currMapInfo.sizeX > currMapInfo.sizeY ? markerSize/currMapInfo.sizeX : markerSize/currMapInfo.sizeY
        }
        calculateXYSize(markerElement,markSizeCalc)
    })
}

function clearMarkers() {
    currLoadedMarkers.forEach(markContainer => {
        markContainer.element.remove()
    });
    currLoadedMarkers = []
}

async function initMarkers(markers,mapInfo) {
    baseMarkerInfo = await baseMarkerInfo
    markers.forEach(marker => {
        if (mapInfo != null && mapInfo.customMarkers != null && mapInfo.customMarkers[marker.id] != null) {
            marker.__proto__ = mapInfo.customMarkers[marker.id]
            if (baseMarkerInfo[marker.id]) {
                marker.__proto__.__proto__ = baseMarkerInfo[marker.id]
            }
        } else {
            marker.__proto__ = baseMarkerInfo[marker.id]
        }
        if (marker.amnt != undefined && !marker.supportsNumbers) {
            marker.amnt = undefined
        }
    })
}

function createMarkerElement(markerInfo) {
    let newMarker = document.createElement("div")
    newMarker.classList = "centeredTransform"

    let markOutline = document.createElement("img")
    markOutline.src = "mrkOutline.png"
    markOutline.classList = "mrkOutline"

    const color = markerInfo.color ? markerInfo.color : defMarkColor
    let markColor = document.createElement("div")
    markColor.classList = "mrkColor"
    markColor.style.backgroundColor = "rgb("+color.join()+")"
    newMarker.appendChild(markOutline)
    newMarker.appendChild(markColor)
    newMarker.style.top = (markerInfo.Y*100).toString()+"%"
    newMarker.style.left = (markerInfo.X*100).toString()+"%"
    newMarker.style.containerType = "size"

    if (markerInfo.supportsNumbers && markerInfo.amnt) {
        let markNumber = document.createElement("div")
        markNumber.innerText = markerInfo.amnt.toString()
        markNumber.classList = "mrkNum"
        newMarker.appendChild(markNumber)
    }
    newMarker.onmouseenter = () => {
        showCursorNote(markerInfo)
        newMarker.style.zIndex = 1
    }
    newMarker.onmouseleave = () => {
        hideCursorNote()
        newMarker.style.zIndex = 0
    }

    newMarker.ontouchstart = () => {
        let currMarkerBounds = newMarker.getBoundingClientRect()
        let height = currMarkerBounds.bottom-currMarkerBounds.top
        let width = currMarkerBounds.right-currMarkerBounds.left
        mouseXY = [currMarkerBounds.left+width/2,currMarkerBounds.top+height/2]
        showCursorNote(markerInfo)
        newMarker.style.zIndex = 1
    }
    newMarker.ontouchend = () => {
        hideCursorNote()
        newMarker.style.zIndex = 0
    }
    return newMarker
}

async function loadMarkers(markers,mapInfo = null) {
    await initMarkers(markers,mapInfo)
    markers.forEach(markerInfo => {
        let newMarker = createMarkerElement(markerInfo)
        calculateXYSize(newMarker,markerSize)
        mapDiv.appendChild(newMarker)
        currLoadedMarkers.push({markerInfo:markerInfo,element:newMarker})
    })
    refreshExistingMarkers()
}

function toggleMarkerOpacity(markId, visible) {
    currLoadedMarkers.forEach(markContainer => {
        if (markContainer.markerInfo.id == markId) {
            if (!visible) {
                mapDiv.removeChild(markContainer.element)
            } else {
                mapDiv.appendChild(markContainer.element)
            }
        }
    })
}

function refreshLegend() {
    if (currMapInfo == null) {
        console.log("no info")
        return
    }
    let parentRect = legendDiv.parentElement.getBoundingClientRect()
    let height = parentRect.bottom-parentRect.top
    let size = (currMapInfo.legendFSizeY != null ? currMapInfo.legendFSizeY : 17)/currMapInfo.sizeY*height
    legendDiv.style.fontSize = size.toString()+"px"
}

async function createLegend(mapInfo) {
    baseMarkerInfo = await baseMarkerInfo
    let mainHeader = document.getElementById("mapName")
    mainHeader.innerText = mapInfo.name + " Map"

    let markerLegend = document.getElementById("markersLegend")
    markerLegend.innerHTML = ""

    let markersBase = {}
    await mapInfo.markers.forEach(async (element) => {
        if (markersBase[element.id]) {
            return
        }
        markersBase[element.id] = Object.assign({},element)
        await initMarkers([markersBase[element.id]],mapInfo)
    });
    Object.keys(markersBase).forEach(key => {
        let element = markersBase[key]
        element.X = 0
        element.Y = 0
        element.amnt = null
        element.note = null

        let markDiv = document.createElement("div")
        markDiv.style.order = element.priority != null ? -element.priority : 0
        markDiv.style.display = "inline-flex"
        
        let markElement = createMarkerElement(element)
        markElement.onmouseenter = ""
        markElement.onmouseleave = ""
        markElement.ontouchstart = ""
        markElement.ontouchend = ""
        markElement.classList = "mrkLegend"
        let visible = true
        markElement.onmouseup = (mouseEvent) => {
            if (mouseEvent.button != 0) {
                return
            }
            console.log(markElement)
            if (visible) {
                visible = false
                markElement.style.opacity = 0.5
                toggleMarkerOpacity(element.id,visible)
            } else {
                visible = true
                markElement.style.opacity = 1
                toggleMarkerOpacity(element.id,visible)
            }
        }
        markDiv.appendChild(markElement)

        let legendText = document.createElement("div")
        legendText.innerText = element.legend
        legendText.style.float = "left"
        markDiv.appendChild(legendText)

        markerLegend.appendChild(markDiv)
    })

    let gatherableHeader = document.getElementById("gatherableHeader")
    let gatherables = document.getElementById("gatherableList")
    gatherableHeader.style.opacity = mapInfo.gatherable.length <= 0 ? 0 : 1
    gatherables.style.opacity = mapInfo.gatherable.length <= 0 ? 0 : 1
    gatherables.innerText = mapInfo.gatherable.join("\n")
    refreshLegend()
}


async function loadMap(mapLoad) {
    clearMarkers()
    map.src = mapLoad.imgPath
    currMapId = mapLoad.id
    currMapInfo = mapLoad
    markerSize = mapLoad.markerSize != null ? mapLoad.markerSize : defMarkerSize
    mapAspect = (mapLoad.sizeX*1.2)/mapLoad.sizeY
    calculateXYSize(containerMain, mapScale, mapAspect)
    switch (mapLoad.legendPos) {
        case 1: {
            legendDiv.style.textAlign = "left"
            legendDiv.style.alignItems = "flex-start"
            break
        }
        case 2: {
            legendDiv.style.textAlign = "right"
            legendDiv.style.alignItems = "flex-end"
            break
        }
    }
    await loadMarkers(mapLoad.markers,mapLoad)
    await createLegend(mapLoad)
}

async function loadMapIdIndex(id,index) {
    allMapInfo = await allMapInfo
    if (!allMapInfo[id]) {
        return false
    }
    let mapLoad = allMapInfo[id]
    if (Array.isArray(mapLoad)) {
        if (index == null || mapLoad.length <= index || index < 0) {
            return false
        }
        currMapIndex = index
        currMapAmnt = mapLoad.length
        mapLoad = mapLoad[index]
    } else {
        currMapIndex = 0
        currMapAmnt = 1
    }
    console.log(mapLoad)
    await loadMap(mapLoad)
    resizeRefresh()
    return
}

let mapSelect = document.getElementById("mapSelect")
let innerMapSelect = document.getElementById("maps")
async function loadMapSelector(filterStr) {
    allMapInfo = await allMapInfo
    innerMapSelect.innerHTML = ""
    let categories = {}
    Object.keys(allMapInfo).forEach(key=>{
        let map = allMapInfo[key]
        if (Array.isArray(map)) {
            map = map[0]
        }
        if (!map.name.toLowerCase().includes(filterStr.toLowerCase())) {
            return
        }
        if (!categories[map.category]) {
            categories[map.category] = [map]
        } else {
            categories[map.category].push(map)
        }
    })
    Object.keys(categories).forEach(category=>{
        let maps = categories[category]
        let catHeader = document.createElement("div")
        catHeader.innerText = category
        catHeader.classList = "selectCatHeader"
        innerMapSelect.appendChild(catHeader)
        maps.forEach(map => {
            let mapButton = document.createElement("div")
            mapButton.classList = "mapSelectElement"
            mapButton.innerText = map.name
            mapButton.onmouseup = (mouseEvent) => {
                if (mouseEvent.button != 0) {
                    return
                }
                loadMapIdIndex(map.id,0)
            }
            innerMapSelect.appendChild(mapButton)
        })
    })
}

document.getElementById("selectSearch").oninput = () => {
    loadMapSelector(document.getElementById("selectSearch").value)
}

let mapSelectShown = false
let selectExpandRibbon = document.getElementById("selectExpandRibbon")
function setMapSelectVisibility(visibility) {
    mapSelectShown = visibility
    switch (mapSelectShown) {
        case true: {
            mapSelect.style.transform = "translateY(-100%)"
            innerMapSelect.style.opacity = 1
            mapSelect.style.backgroundColor = "rgba(0,0,0,0.7)"
            mapSelect.appendChild(innerMapSelect)    
            break;
        }
        case false: {
            mapSelect.style.transform = "translateY(-10%)"
            innerMapSelect.style.opacity = 0
            mapSelect.style.backgroundColor = "rgba(0,0,0,0)"
            innerMapSelect.remove()
            break;
        }
    }
}
selectExpandRibbon.onmouseup = (mouseEvent) => {
    if (mouseEvent.button != 0) {
        return
    }
    setMapSelectVisibility(!mapSelectShown)
}
setMapSelectVisibility(false)

let helpWindowShown = false
let helpDiv = document.getElementById("help")
let helpExpandRibbon = document.getElementById("helpExpandRibbon")
let innerHelp = document.getElementById("innerHelp")
function setHelpVisibility(visibility) {
    helpWindowShown = visibility
    switch (helpWindowShown) {
        case true: {
            helpDiv.style.transform = "translate(-100%,-100%)"
            innerHelp.style.opacity = 1
            helpDiv.style.backgroundColor = "rgba(0,0,0,0.7)"
            helpDiv.appendChild(innerHelp)    
            break;
        }
        case false: {
            helpDiv.style.transform = "translate(-100%,-10%)"
            innerHelp.style.opacity = 0
            helpDiv.style.backgroundColor = "rgba(0,0,0,0)"
            innerHelp.remove()
            break;
        }
    }
}
helpExpandRibbon.onmouseup = (mouseEvent) => {
    if (mouseEvent.button != 0) {
        return
    }
    setHelpVisibility(!helpWindowShown)
}
setHelpVisibility(false)

let debugEnabled = false
let editPlacing = false
let editRemoving = false
let editMarkIdInput = document.getElementById("editMarkId")
let editMarkAmntInput = document.getElementById("editMarkAmnt")
let editMarkNoteInput = document.getElementById("editMarkNote")
let editPlaceBtn = document.getElementById("editPlaceMarkers")
let editRemoveBtn = document.getElementById("editRemoveMarkers")
let editExportBtn = document.getElementById("editExportJSON")
let editJSONOutput = document.getElementById("editJSONOutput")

editPlaceBtn.onmouseup = (mouseEvent) => {
    if (mouseEvent.button != 0) {
        return
    }
    editRemoveBtn.innerText = "Remove Markers"
    editRemoving = false
    editPlacing = !editPlacing
    if (editPlacing) {
        editPlaceBtn.innerText = "Stop Placing"
    } else {
        editPlaceBtn.innerText = "Start Placing"
    }
}

editRemoveBtn.onmouseup = (mouseEvent) => {
    if (mouseEvent.button != 0) {
        return
    }
    editPlaceBtn.innerText = "Start Placing"
    editPlacing = false
    editRemoving = !editRemoving
    if (editRemoving) {
        editRemoveBtn.innerText = "Stop Removing"
    } else {
        editRemoveBtn.innerText = "Remove Markers"
    }
}

editExportBtn.onmouseup = (mouseEvent) => {
    if (mouseEvent.button != 0) {
        return
    }
    let markArray = []
    currLoadedMarkers.forEach(element => {
        markArray.push(element.markerInfo)
    });
    editJSONOutput.value = JSON.stringify(markArray)
}

mapDiv.onmouseup = async (mouseEvent) => {
    if (mouseEvent.button != 0) {
        return
    }
    baseMarkerInfo = await baseMarkerInfo
    if (!debugEnabled) {
        return
    }
    if (!editPlacing && !editRemoving) {
        return
    }
    if (editPlacing) {
        let markerInfo = {}
        let markerId = editMarkIdInput.value
        let idValid = false
        if (currMapInfo.customMarkers && currMapInfo.customMarkers[markerId]) {
            idValid = true
        }
        if (baseMarkerInfo[markerId]) {
            idValid = true
        }
        if (!idValid) {
            return
        }
        markerInfo.id = markerId
        let markerAmnt = parseInt(editMarkAmntInput.value)
        if (markerAmnt > 0) {
            markerInfo.amnt = markerAmnt
        }
        let markerNote = editMarkNoteInput.value
        if (markerNote != "") {
            markerInfo.note = markerNote
        }
        let mapRect = mapDiv.getBoundingClientRect()
        let width = mapRect.right-mapRect.left
        let height = mapRect.bottom-mapRect.top
        let xMouseRel = mouseEvent.clientX-mapRect.left
        let yMouseRel = mouseEvent.clientY-mapRect.top
        markerInfo.X = xMouseRel/width
        markerInfo.Y = yMouseRel/height
        await initMarkers([markerInfo],currMapInfo)
        let newMarker = createMarkerElement(markerInfo)
        mapDiv.appendChild(newMarker)
        currLoadedMarkers.push({markerInfo:markerInfo,element:newMarker})
        refreshExistingMarkers()
        return
    }
    if (editRemoving) {
        let elementsAtPos = document.elementsFromPoint(mouseEvent.clientX,mouseEvent.clientY)
        for (let markIndex = currLoadedMarkers.length-1; markIndex>=0; markIndex--) {
            let markerContainer = currLoadedMarkers[markIndex]
            if (elementsAtPos.find(element => element == markerContainer.element)) {
                markerContainer.element.remove()
                currLoadedMarkers.splice(markIndex,1)
                break
            }
        }
        return
    }
}

if (!debugEnabled) {
    document.getElementById("editConfig").remove()
} else {
    document.getElementById("editConfig").style.opacity = 1
}

let htmlMain = document.getElementById("htmlMain")
function resizeRefresh() {
    calculateXYSize(containerMain, mapScale, mapAspect)
    refreshExistingMarkers()
    refreshScrollVisibility()
    refreshLegend()
}


let minZoom=0.1
function setScale(scale) {
    mapScale = scale <= minZoom ? minZoom : scale
    document.getElementById("zoomDisplay").innerText = Math.round(mapScale*100).toString()+"%"
    resizeRefresh()
}

document.getElementById("zoomin").onmouseup = (mouseEvent) => {
    if (mouseEvent.button != 0) {
        return
    }
    setScale(mapScale+0.1)
}

document.getElementById("zoomout").onmouseup = (mouseEvent) => {
    if (mouseEvent.button != 0) {
        return
    }
    setScale(mapScale-0.1)
}

setScale(1)

let containerOverflow = document.getElementById("mapContainerOverflow")

containerOverflow.onwheel = (event) => {
    if (!event.ctrlKey) {
        return
    }
    let wheelDirection = Math.sign(event.wheelDeltaY)
    if (wheelDirection == 0) {
        return
    }
    setScale(mapScale+0.1*wheelDirection)
    event.preventDefault()
}

let touchScaling = false
let touchBeganScale = 0
let touchBeganDist = 0

function calculateTouchDist(touches) {
    return Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY)
}

containerOverflow.ontouchstart = (event) => {
    if (event.touches.length != 2) {
        return
    }
    touchScaling = true
    touchBeganScale = mapScale
    touchBeganDist = calculateTouchDist(event.touches)
    event.preventDefault()
}
containerOverflow.ontouchmove = (event) => {
    if (!touchScaling) {
        return
    }
    let distScale = calculateTouchDist(event.touches)/touchBeganDist
    setScale(touchBeganScale+1*distScale)
    event.preventDefault()
}
containerOverflow.ontouchend = () => {
    touchScaling = false
    touchBeganScale = 0
    touchBeganDist = 0
}

console.log(baseMarkerInfo)
loadMapIdIndex(currMapId,currMapIndex)
window.onload = resizeRefresh
window.onresize = resizeRefresh
loadMapSelector("")