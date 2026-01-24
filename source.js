const map = document.getElementById("mainMapImg") //actual image element
const mapDiv = map.parentElement //div that contains the image, markers, and legend
const containerMain = mapDiv.parentElement //like mapDiv but also contains the left and right scroll buttons
const legendDiv = document.getElementById("legend") //map legend
let mapAspect = 2 //current map aspect ratio (the 2 is arbitrary it gets overwritten when a map loads)
let mapScale = 1 //current map scale (1 is 100%)
let currMapIndex = 0 //index of the map to account for multi image maps (if its a single image its 0)
let currMapAmnt = 1 //amount of images for the map that is loaded
let currMapId = "dawn" //self explanatory, dawn island is the default loaded map
let currMapInfo = null
const defMarkerSize = 14 //default marker size
let markerSize = defMarkerSize //marker size of the map that is loaded
const defMarkColor = [255,0,0] //default marker color (red)

let noCacheRequest = {
    method:"GET",
    headers:{
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": 0
    }
}

async function getBaseMarkerInfo() {
    let res = await fetch("./markerInfo.json",noCacheRequest).then(response => response.json())
    return res
}
async function getMapInfo() {
    let res = await fetch("./mapInfo.json",noCacheRequest).then(response=>response.json())
    return res
}
const baseMarkerInfo = getBaseMarkerInfo()
const allMapInfo = getMapInfo()
let currLoadedMarkers = []

//just use this variable to determine whether "size" in calculateXYsize means in respect to the smallest or biggest dimension
//thats to say, if the variable is true, then 1 unit of size will correspond to 100% of the smallest dimension, be it width or height
//if the variable is false, 1 unit of size will correspond to 100% of the biggest dimension, be it width or height
const scaleSmallest = true
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


//left and right buttons for scrolling through the maps with several images
const scrollLeft = document.getElementById("scrollLeft")
const scrollRight = document.getElementById("scrollRight")
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
}

scrollLeft.addEventListener("mouseup", (mouseEvent) => {
    if (mouseEvent.button != 0) {
        return
    }
    if (scrollLeft.style.opacity == 0) {
        return
    }
    loadMapIdIndex(currMapId,currMapIndex-1)
})

scrollRight.addEventListener("mouseup", (mouseEvent) => {
    if (mouseEvent.button != 0) {
        return
    }
    if (scrollRight.style.opacity == 0) {
        return
    }
    loadMapIdIndex(currMapId,currMapIndex+1)
})


//marker note on mouse hover
const cursorNoteDiv = document.createElement("div")
cursorNoteDiv.classList = "mrkNote"
let currHoveredMarker = null
let mouseXY = []
document.addEventListener("mousemove", (mouseEvent) => {
    mouseXY = [mouseEvent.clientX,mouseEvent.clientY]
    if (currHoveredMarker != null) {
        updateCursorNote()
    }
})

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


//everything marker related, refreshing their size, clearing them, initializing them, etc.
function refreshExistingMarkers() {
    currLoadedMarkers.forEach(markContainer => {
        markerElement = markContainer.element
        markerInfo = markContainer.markerInfo
        markerElement.style.top = (markerInfo.Y*100).toString()+"%"
        markerElement.style.left = (markerInfo.X*100).toString()+"%"

        let markSizeCalc
        let baseUnit
        if (scaleSmallest == true) {
            markSizeCalc = currMapInfo.sizeX < currMapInfo.sizeY ? markerSize/currMapInfo.sizeX : markerSize/currMapInfo.sizeY
            baseUnit = "cqmin"
        } else {
            markSizeCalc = currMapInfo.sizeX > currMapInfo.sizeY ? markerSize/currMapInfo.sizeX : markerSize/currMapInfo.sizeY
            baseUnit = "cqmax"
        }
        markerElement.style.width = "calc(100"+baseUnit+"*"+markSizeCalc.toString()+")"
        markerElement.style.height = "calc(100"+baseUnit+"*"+markSizeCalc.toString()+")"
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
        const currMarkerBounds = newMarker.getBoundingClientRect()
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


//map legends
function refreshLegend() {
    if (currMapInfo == null) {
        console.log("no info")
        return
    }
    //const parentRect = legendDiv.parentElement.getBoundingClientRect()
    //let height = parentRect.bottom-parentRect.top
    let fontSize = currMapInfo.legendFSizeY != null ? currMapInfo.legendFSizeY : 17
    let sizeRatio = fontSize/currMapInfo.sizeY
    legendDiv.style.fontSize = "calc(100cqh*"+sizeRatio.toString()+")"
}

async function createLegend(mapInfo) {
    baseMarkerInfo = await baseMarkerInfo
    const mainHeader = document.getElementById("mapName")
    mainHeader.innerText = mapInfo.name + " Map"

    const markerLegend = document.getElementById("markersLegend")
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
        markElement.onmouseenter = null
        markElement.onmouseleave = null
        markElement.ontouchstart = null
        markElement.ontouchend = null
        markElement.classList = "mrkLegend"
        let visible = true
        markElement.addEventListener("mouseup" = (mouseEvent) => {
            if (mouseEvent.button != 0) {
                return
            }
            //console.log(markElement)
            if (visible) {
                visible = false
                markElement.style.opacity = 0.5
                toggleMarkerOpacity(element.id,visible)
            } else {
                visible = true
                markElement.style.opacity = 1
                toggleMarkerOpacity(element.id,visible)
            }
        })
        markDiv.appendChild(markElement)

        let legendText = document.createElement("div")
        legendText.innerText = element.legend
        legendText.style.float = "left"
        markDiv.appendChild(legendText)

        markerLegend.appendChild(markDiv)
    })

    const gatherableHeader = document.getElementById("gatherableHeader")
    const gatherables = document.getElementById("gatherableList")
    gatherableHeader.style.opacity = mapInfo.gatherable.length <= 0 ? 0 : 1
    gatherables.style.opacity = mapInfo.gatherable.length <= 0 ? 0 : 1
    gatherables.innerText = mapInfo.gatherable.join("\n")
    refreshLegend()
}



//map loading
async function loadMap(mapLoad) {
    clearMarkers()
    map.src = "" //setting it to nothing temporarily so that older images dont just get stuck there while its loading and the user gets confused
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
    refreshScrollVisibility()
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
    //console.log(mapLoad)
    await loadMap(mapLoad)
    return
}


//map select menu
const mapSelect = document.getElementById("mapSelect") //includes the expand ribbon
const innerMapSelect = document.getElementById("maps") //just the flexbox that contains the map buttons and the categories
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
            mapButton.addEventListener("mouseup", (mouseEvent) => {
                if (mouseEvent.button != 0) {
                    return
                }
                loadMapIdIndex(map.id,0)
            })
            innerMapSelect.appendChild(mapButton)
        })
    })
}

document.getElementById("selectSearch").addEventListener("input", () => {
    loadMapSelector(document.getElementById("selectSearch").value)
})

let mapSelectShown = false
const selectExpandRibbon = document.getElementById("selectExpandRibbon")
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
selectExpandRibbon.addEventListener("mouseup", (mouseEvent) => {
    if (mouseEvent.button != 0) {
        return
    }
    setMapSelectVisibility(!mapSelectShown)
})
setMapSelectVisibility(false)


//help window
let helpWindowShown = false
const helpDiv = document.getElementById("help") //container for both the window and the expand ribbon
const helpExpandRibbon = document.getElementById("helpExpandRibbon")
const innerHelp = document.getElementById("innerHelp") //help window text
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
helpExpandRibbon.addEventListener("mouseup", (mouseEvent) => {
    if (mouseEvent.button != 0) {
        return
    }
    setHelpVisibility(!helpWindowShown)
})
setHelpVisibility(false)


//debug marker place, remove, export
let debugEnabled = false
let editPlacing = false
let editRemoving = false
const editMarkIdInput = document.getElementById("editMarkId")
const editMarkAmntInput = document.getElementById("editMarkAmnt")
const editMarkNoteInput = document.getElementById("editMarkNote")
const editPlaceBtn = document.getElementById("editPlaceMarkers")
const editRemoveBtn = document.getElementById("editRemoveMarkers")
const editExportBtn = document.getElementById("editExportJSON")
const editJSONOutput = document.getElementById("editJSONOutput")

editPlaceBtn.addEventListener("mouseup", (mouseEvent) => {
    if (mouseEvent.button != 0) {
        return
    }
    editRemoveBtn.innerText = "Remove Markers"
    editRemoving = false
    editPlacing = !editPlacing
    if (editPlacing) {
        mapDiv.style.cursor = "default"
        editPlaceBtn.innerText = "Stop Placing"
    } else {
        editPlaceBtn.innerText = "Start Placing"
        mapDiv.style.cursor = "grab"
    }
})

editRemoveBtn.addEventListener("mouseup", (mouseEvent) => {
    if (mouseEvent.button != 0) {
        return
    }
    editPlaceBtn.innerText = "Start Placing"
    editPlacing = false
    editRemoving = !editRemoving
    if (editRemoving) {
        mapDiv.style.cursor = "default"
        editRemoveBtn.innerText = "Stop Removing"
    } else {
        editRemoveBtn.innerText = "Remove Markers"
        mapDiv.style.cursor = "grab"
    }
})

editExportBtn.addEventListener("mouseup", (mouseEvent) => {
    if (mouseEvent.button != 0) {
        return
    }
    let markArray = []
    currLoadedMarkers.forEach(element => {
        markArray.push(element.markerInfo)
    });
    editJSONOutput.value = JSON.stringify(markArray)
})

mapDiv.addEventListener("mouseup", async (mouseEvent) => {
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
        const mapRect = mapDiv.getBoundingClientRect()
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
})

if (!debugEnabled) {
    document.getElementById("editConfig").remove()
} else {
    document.getElementById("editConfig").style.opacity = 1
}


//map scaling
function resizeRefresh() {
    calculateXYSize(containerMain, mapScale, mapAspect)
}

const containerOverflow = document.getElementById("mapContainerOverflow") //element that contains the entire map but that is allowed to overflow as to let scroll bars exist

let minZoom=0.1
function setScale(scale,zoomX=0,zoomY=0) {
    mapScale = scale <= minZoom ? minZoom : scale
    document.getElementById("zoomDisplay").innerText = Math.round(mapScale*100).toString()+"%"

    let mapContainerRect = containerMain.getBoundingClientRect()
    let sizeXmap = mapContainerRect.right-mapContainerRect.left
    let sizeYmap = mapContainerRect.bottom-mapContainerRect.top
    let currScrollX = (containerOverflow.scrollLeft+zoomX)/sizeXmap
    let currScrollY = (containerOverflow.scrollTop+zoomY)/sizeYmap
    resizeRefresh()
    mapContainerRect = containerMain.getBoundingClientRect()
    sizeXmap = mapContainerRect.right-mapContainerRect.left
    sizeYmap = mapContainerRect.bottom-mapContainerRect.top
    let pointPosX = currScrollX*sizeXmap-zoomX
    let pointPosY = currScrollY*sizeYmap-zoomY
    let X = pointPosX
    let Y = pointPosY
    containerOverflow.scroll(X,Y)
}

document.getElementById("zoomin").addEventListener("mouseup", (mouseEvent) => {
    if (mouseEvent.button != 0) {
        return
    }
    setScale(mapScale+0.1)
})

document.getElementById("zoomout").addEventListener("mouseup", (mouseEvent) => {
    if (mouseEvent.button != 0) {
        return
    }
    setScale(mapScale-0.1)
})

setScale(1)


//zooming with the scroll wheel
const ctrlZoom = false //if true, forces you to hold down ctrl to zoom
containerOverflow.addEventListener("wheel", (event) => {
    if (ctrlZoom && !event.ctrlKey) {
        return
    }
    let wheelDirection = Math.sign(event.wheelDeltaY)
    if (wheelDirection == 0) {
        return
    }
    setScale(mapScale+0.1*wheelDirection,event.clientX,event.clientY)
    if (!editPlacing && !editRemoving) {
        mapDiv.dispatchEvent(new MouseEvent("mouseup",{button:0}))
    }
    event.preventDefault()
})


//moving image around by drag clicking
let grabScrolling = false
let grabBeganScrollX = 0
let grabBeganScrollY = 0
let grabBeganX = 0
let grabBeganY = 0
mapDiv.addEventListener("mousedown", (event) => {
    if (event.button != 0) {
        return
    }
    if (editPlacing || editRemoving) {
        return
    }
    grabScrolling = true
    grabBeganScrollX = containerOverflow.scrollLeft
    grabBeganScrollY = containerOverflow.scrollTop
    grabBeganX = event.clientX
    grabBeganY = event.clientY
    mapDiv.style.cursor = "grabbing"
    event.preventDefault()
})

mapDiv.addEventListener("mouseup", (event) => {
    if (event.button != 0) {
        return
    }
    if (editPlacing || editRemoving) {
        return
    }
    grabScrolling = false
    mapDiv.style.cursor = "grab"
    event.preventDefault()
})

mapDiv.addEventListener("mousemove", (event) => {
    if (!grabScrolling) {
        return
    }
    let diffX = event.clientX-grabBeganX
    let diffY = event.clientY-grabBeganY
    containerOverflow.scroll(grabBeganScrollX-diffX,grabBeganScrollY-diffY)
})


//pinch zooming (mobile)
let touchScaling = false
let touchBeganScale = 0
let touchBeganDist = 0

function calculateTouchDist(touches) {
    return Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY)
}

containerOverflow.addEventListener("touchstart", (event) => {
    if (event.touches.length != 2) {
        return
    }
    touchScaling = true
    touchBeganScale = mapScale
    touchBeganDist = calculateTouchDist(event.touches)
    
    event.preventDefault()
})

containerOverflow.addEventListener("touchmove", (event) => {
    if (!touchScaling || event.touches.length != 2) {
        touchScaling = false
        return
    }
    let containerRect = containerOverflow.getBoundingClientRect()
    let width = containerRect.right-containerRect.left
    let height = containerRect.bottom-containerRect.top
    let minSize = Math.min(width,height)

    let currTouchDist = calculateTouchDist(event.touches)
    let distScale = (currTouchDist-touchBeganDist)/minSize
    let touchScaleCenterX = (event.touches[0].clientX+event.touches[1].clientX)/2
    let touchScaleCenterY = (event.touches[0].clientY+event.touches[1].clientY)/2
    setScale(touchBeganScale*(distScale+1),touchScaleCenterX,touchScaleCenterY)
    event.preventDefault()
})

containerOverflow.addEventListener("touchend", () => {
    touchScaling = false
})


//load default map as to have something
loadMapIdIndex(currMapId,currMapIndex)
window.onload = resizeRefresh
window.onresize = resizeRefresh
loadMapSelector("")