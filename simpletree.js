let STree = function(el, nodeData, options){
    this.container = el;
    this.list = null;
    this.nodes = nodeData;
    this.options = options;
    this.eventListeners = {};
    this.draggedNode = null;
    this.pathAttribute = 'label';
    this.pathSeparator = '/';
    
    this.LIST_TAG = 'ul';
    this.LIST_ITEM_TAG = 'li';
    this.LIST_LABEL_TAG = 'div';
    this.LIST_LABEL_EXPAND_TAG = 'span';
    this.LIST_LABEL_TEXT_TAG = 'span';
    this.LIST_FOLDER_EXPANDED = '&#x203A;';
    this.LIST_FOLDER_COLLAPSED = '&#x203A;';

    this.EVENT_ITEM_SELECT = 'stree-item-select';
    this.EVENT_ITEM_MOVE = 'stree-item-move';
    this.EVENT_FOLDER_EXPAND = 'stree-folder-expand';

    this.addEventListener = function(eventKey, listener){
        if(!this.eventListeners[eventKey])
            this.eventListeners[eventKey] = [];
        this.eventListeners[eventKey].push(listener);
    }

    this.sendEvent = function(eventKey, eventObj){
        var listeners = this.eventListeners[eventKey];
        if(listeners && listeners.length > 0){
            for(var lIdx=0;lIdx<listeners.length;lIdx++){
                listeners[lIdx].call(this, eventObj);
            }
        }
    }

    this.onNodeExpanded = function(node){
        var eventObj = {node: node};
        this.sendEvent(this.EVENT_FOLDER_EXPAND, eventObj);
    }

    this.onNodeSelected = function(node){
        var eventObj = {node: node};
        this.sendEvent(this.EVENT_ITEM_SELECT, eventObj);
    }

    this.onNodeMoved = function(node, oldPath, newPath){
        var eventObj = {node: node, oldPath:oldPath, newPath:newPath};
        this.sendEvent(this.EVENT_ITEM_MOVE, eventObj);
    }

    this.getNewId = function(length) {
        var idPrefix = this.container.id? this.container.id + '-' : '';
        return idPrefix + 'stree-' + Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);
    }

    this.getOnNodeExpandListener = function(node, stree){
        return function(e){
            if(node.expanded){
                node.expanded = false;
                node.listEl.classList.remove('stree-list-expanded');
                node.expandEl.innerHTML = stree.LIST_FOLDER_COLLAPSED;
                node.expandEl.classList.remove('expanded');
            }else{
                node.expanded = true;
                node.listEl.classList.add('stree-list-expanded');
                node.expandEl.innerHTML = stree.LIST_FOLDER_EXPANDED;
                node.expandEl.classList.add('expanded');
            }
            
            stree.onNodeExpanded.call(stree, node);
        }
    }

    this.addNodeExpand = function(node, nodeElem, labelElem){
        var expandElem = document.createElement(this.LIST_LABEL_EXPAND_TAG);
        expandElem.classList.add('stree-item-expand');
        if(node.children && node.children.length>0){
            expandElem.classList.add('stree-item-folder');
            expandElem.innerHTML = this.LIST_FOLDER_COLLAPSED;
            if(!node.onExpand)
                node.onExpand = this.getOnNodeExpandListener(node, this);
            expandElem.addEventListener('click', node.onExpand);
        }else{
            expandElem.classList.add('stree-item-default');
            expandElem.innerHTML = "";
        }
        node.expandEl = expandElem;
        labelElem.appendChild(expandElem)
    }

    this.removeNode = function(node, childNode){
        var rVal = false;
        if(node.children && node.children.length >0){
            for(var cIdx=0;cIdx<node.children.length;cIdx++){
                var cNode = node.children[cIdx];
                if(cNode.id === childNode.id){
                    node.children.splice(cIdx, 1);
                    node.listEl.removeChild(cNode.el);
                    rVal = true;
                    break;
                }
            }
        }
        if(node.children.length === 0){
            node.el.removeChild(node.listEl);
            delete node.listEl;
            node.expandEl.removeEventListener('click', node.onExpand);
            delete node.onExpand;
            node.expandEl.classList.remove('stree-item-folder');
            node.expandEl.classList.add('stree-item-default');
            node.expandEl.innerHTML = "";            
        }
        return rVal;
    }

    this.removeNodeById = function(idStr){
        var node = this.getNodeById(idStr);
        if(node){
            return this.removeNode(node.parent, node);
        }
        return false
    }

    this.getNodeById = function(idStr, startNode){
        var node = (startNode)? startNode : this.nodes;
        if(node.id === idStr)
            return node;
        else if(node.children && node.children.length > 0){
            for(var cIdx=0;cIdx<node.children.length;cIdx++){
                cNode = this.getNodeById(idStr, node.children[cIdx]);
                if(cNode)
                    return cNode;
            }
        }else{
            return null;
        }
    }

    this.getNodePath = function(node, full){
        var currNode = node;
        var path = (full)? this.pathSeparator + node.label : "";
        while(!currNode.isRoot){
            path = this.pathSeparator + currNode.parent.label + path;
            currNode = currNode.parent;
        }
        return path;
    }

    this.moveNodeTo = function(node, targetNode){
        if(node && targetNode){
            var oldPath = this.getNodePath(node);
            var currParent = node.parent;
            this.removeNode(currParent, node);

            node.parent = targetNode;
            if(!targetNode.children)
                targetNode.children = [];
            targetNode.children.push(node);
            if(!targetNode.listEl){
                targetNode.listEl = this.getNodeList(targetNode.parent);
                targetNode.el.appendChild(targetNode.listEl);
                targetNode.expandEl.classList.remove('stree-item-default');
                targetNode.expandEl.classList.add('stree-item-folder');
                targetNode.expandEl.innerHTML = this.LIST_FOLDER_COLLAPSED;
                if(!targetNode.onExpand)
                    targetNode.onExpand = this.getOnNodeExpandListener(targetNode, this);
                targetNode.expandEl.addEventListener('click', targetNode.onExpand);
            }
            targetNode.listEl.appendChild(node.el);
            var newPath = this.getNodePath(node);
            this.onNodeMoved(node, oldPath, newPath);
        }
    }

    this.getOnSelectListener = function(node, stree){
        return function(e){
            if(e.srcElement.classList.contains('stree-item-expand'))
                return;
            var currSelected = stree.selectedNode;
            if(currSelected){
                currSelected.selected = false;
                currSelected.labelEl.classList.remove('stree-item-selected');
            }
            
            node.selected = true;
            node.labelEl.classList.add('stree-item-selected');
            stree.selectedNode = node;
            stree.onNodeSelected.call(stree, node);
            if(node.children && node.children.length > 0 && node.onExpand)
                node.onExpand.call(this, e);
        }
    }

    this.getOnMouseOverListener = function(node, stree){
        return function(e){
            node.el.classList.add('hover');
            node.labelTextEl.classList.add('hover');
        }
    }

    this.getOnMouseOutListener = function(node, stree){
        return function(e){
            node.el.classList.remove('hover');
            node.labelTextEl.classList.remove('hover');
        }
    }

    this.getOnDragListener = function(node, stree){
        return function(e){
            console.log('Dragged: ' + node.label);
            stree.draggedNode = node;
        }
    }

    this.getOnDropListener = function(node, stree){
        return function(e){
            console.log('Dropped on: ' + node.label);
            if(stree.draggedNode.parent.id != node.id && stree.draggedNode.id != node.id) //ignore if dropped on its parent or itself
                stree.moveNodeTo(stree.draggedNode, node);
            stree.draggedNode = null;
        }
    }

    this.getContextMenuListener = function(node, stree){
        return function(e){
            if(!stree.contextMenu)
                return;
                
            if(stree.contextMenu.visible)
                stree.contextMenu.hideMenu();
            stree.ctxNode = node;
            if(node.contextMenu && node.contextMenu.items)
                stree.contextMenu.refreshMenu(node.contextMenu.override, node.contextMenu.items);
            else
                stree.contextMenu.refreshMenu(false);

            stree.contextMenu.showMenu(e.clientX, e.clientY, {ctxNode: stree.ctxNode});
            e.preventDefault();
        }
    }

    this.addNodeLabel = function(node, nodeElem){
        var labelElem = document.createElement(this.LIST_LABEL_TAG);
        labelElem.classList.add('stree-item-label');
        
        this.addNodeExpand(node, nodeElem, labelElem);

        var textElem = document.createElement(this.LIST_LABEL_TEXT_TAG);
        textElem.classList.add('stree-item-label-text');
        node.labelTextEl = textElem;
        if(node.label){
            textElem.innerHTML = node.label;
            labelElem.setAttribute('title', node.label);
        }
        labelElem.appendChild(textElem);

        node.onSelect = this.getOnSelectListener(node, this);
        labelElem.addEventListener('click', node.onSelect);
        
        node.onMouseOver = this.getOnMouseOverListener(node, this);
        labelElem.addEventListener('mouseover', node.onMouseOver);

        node.onMouseOut = this.getOnMouseOutListener(node, this);
        labelElem.addEventListener('mouseout', node.onMouseOut);

        if(!node.isRoot){ // prevent drag of root
            labelElem.setAttribute('draggable', true);
            node.onDrag = this.getOnDragListener(node, this);
            labelElem.addEventListener('dragstart', node.onDrag);
        }

        node.onDrop = this.getOnDropListener(node, this);
        labelElem.addEventListener('drop', node.onDrop);

        labelElem.addEventListener('dragover', function(e){e.preventDefault();}); //allow items to be dropped on it

        node.labelEl = labelElem;
        nodeElem.appendChild(labelElem);
    }

    this.addNodeElem = function(parent, node, tag, id, classList, level){
        var nodeElem = document.createElement(tag);
        nodeElem.setAttribute('id', id);
        for(var classIdx=0;classIdx<classList.length;classIdx++)
            nodeElem.classList.add(classList[classIdx]);
        //nodeElem.style.paddingLeft = (level * 4) + 'px';
        if(node)
            this.addNodeLabel(node, nodeElem);
        
        if(parent.el)
            parent.el.appendChild(nodeElem);
        else
            parent.appendChild(nodeElem);
        return nodeElem;
    }

    this.getNodeList = function(parent){
        var listElem = this.addNodeElem(parent, null, this.LIST_TAG, this.getNewId(5), ['stree-list'], 0);
        return listElem;
    }

    this.createRootNode = function(node){
        this.container.classList.add('stree');

        node.isRoot = true;
        this.list = this.getNodeList(this.container);
        this.list.classList.add('stree-list-root');
    
        node.parent = null;
        node.id = this.getNewId(5);
        node.level = 0;
        node.el = this.addNodeElem(this.list, node, this.LIST_ITEM_TAG, node.id, ['stree-list-item'], node.level);

        node.listEl = this.getNodeList(node);
    }

    this.addNode = function(node, parentNode){
        if(!parentNode.children)
            parentNode.children = [];
        parentNode.children.push(node);
        this.createNode(node, parentNode);
    }

    this.createChildNode = function(node, parentNode){
        if(!parentNode.listEl){
            parentNode.listEl = this.getNodeList(parentNode);
            parentNode.el.appendChild(parentNode.listEl);
            parentNode.expandEl.classList.remove('stree-item-default');
            parentNode.expandEl.classList.add('stree-item-folder');
            parentNode.expandEl.innerHTML = this.LIST_FOLDER_COLLAPSED;
            if(!parentNode.onExpand)
                parentNode.onExpand = this.getOnNodeExpandListener(parentNode, this);
            parentNode.expandEl.addEventListener('click', parentNode.onExpand);
        }
        node.isRoot = false;
        node.parent = parentNode;
        node.id = this.getNewId(5);
        node.level = parentNode.level + 1;
        node.el = this.addNodeElem(parentNode.listEl, node, this.LIST_ITEM_TAG, node.id, ['stree-list-item'], node.level);
    }
    
    this.createNode = function(node, parentNode){
        node.expanded = false;
        if(!parentNode){
            this.createRootNode(node);
        }else{
            this.createChildNode(node, parentNode);
        }
        if(node.children && node.children.length > 0){
            node.isFolder = true;
            for(var childIdx=0;childIdx<node.children.length;childIdx++){
                var childNode = node.children[childIdx];
                this.createNode(childNode, node);
            }
        }
    }

    this.getHideMenuHandler = function(stree){
        return function(e){
            if(!e.srcElement.classList.contains('stree-list-item') &&
            !e.srcElement.classList.contains('stree-item-label') &&
            !e.srcElement.classList.contains('stree-item-expand') &&
            !e.srcElement.classList.contains('stree-item-label-text'))
                return true; //if click is happening anywhere not a tree node, cancel context menu

            var nodeElem;
            if(e.srcElement.tagName.toUpperCase() === 'DIV')
                nodeElem = e.srcElement.parentElement;
            else if(e.srcElement.tagName.toUpperCase)
                nodeElem = e.srcElement.parentElement.parentElement;
            
            if(nodeElem && nodeElem.id === stree.ctxNode.id)
                return false;
            else
                return true;
        }
    }

    this.addContextMenu = function(ctxMenu){
        if(!ctxMenu)
            return; //ignore if menu is not defined;
        if(!ctxMenu.id)
            ctxMenu.id = this.getNewId(5);
        this.contextMenu = new SContext(ctxMenu);
        this.contextMenu.addHideMenuHandler(this.getHideMenuHandler(this));
        var nodeLabelElems = document.querySelectorAll('#' + this.container.id + ' .stree-item-label');
        for(var nIdx=0;nIdx<nodeLabelElems.length;nIdx++){
            var labelElem = nodeLabelElems[nIdx];
            var node = this.getNodeById(labelElem.parentElement.id);
            labelElem.addEventListener('contextmenu', this.getContextMenuListener(node, this));
        }
    }

    this.processOptions = function(){
        if(!this.options)
            return; //ignore if no options provided

        this.addContextMenu(this.options.contextMenu);
    }

    this.createTree = function(){
        this.createNode(this.nodes);
        this.processOptions();
    }
    this.createTree(); //Init the tree
}

/*
{
    id: "myMenu",
    items: [
        {
            label: "Menu 1",
            onclick: onMenu1Func,
            items: []
        },
        {
            line: true,
        },
        {
            label: "Menu 2",
            onclick: onMenu1Func,
            items: []
        },
        {
            label: "Menu 3",
            onclick: onMenu1Func,
            items: []
        }
    ]
}

*/

let SContext = function(menu, options){
    this.menu = menu;
    this.menuEl = null;
    this.hideMenuHandlers = [];

    function isFunction(functionToCheck) {
        return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
    }

    this.addHideMenuHandler = function(handler){
        this.hideMenuHandlers.push(handler);
    }

    this.windowClickListener = function(menu){
        return function(e){
            if(!menu.visible)
                return;

            for(var hIdx=0;hIdx<menu.hideMenuHandlers.length;hIdx++){
                if(!menu.hideMenuHandlers[hIdx].call(menu, e))
                    return;
            }

            var classList = e.srcElement.classList;
            if(classList.contains('stree-ctxmenu') || 
            classList.contains('stree-ctxmenu-item') ||
            classList.contains('stree-ctxmenu-line')){
                return; //Ignore if click event is from menu itself
            }else{
                if(menu.visible)
                    menu.hideMenu();
            }
        }
    }

    this.onMenuclick = function(menu, menuClickHandler){
        return function(e){
            menu.hideMenu();
            menuClickHandler.call(menu, e);
        }
    }

    this.showMenu = function(posX, posY, options){
        if(this.visible)
            return; //ignore if menu is already visible

        this.menuTriggerOptions = options;
        this.menuEl.style.left = posX + 'px';
        this.menuEl.style.top = posY + 'px';
        this.menuEl.classList.add('show');
        this.visible = true;
    }

    this.hideMenu = function(){
        if(!this.visible)
            return; //ignore if menu is already hidden

        this.menuEl.classList.remove('show');
        this.visible = false;
    }

    this.addMenuItem = function(item, mark){
        //<span class="stree-ctxmenu-item">Menu 1</span>
        var menuElem = document.createElement('span');
        menuElem.classList.add('stree-ctxmenu-item');
        if(mark)
            menuElem.classList.add('mark');
        if(item.label)
            menuElem.innerHTML = item.label;
        if(isFunction(item.onclick))
            menuElem.addEventListener('click', this.onMenuclick(this, item.onclick));
        
        this.menuEl.appendChild(menuElem);
    }

    this.addLineItem = function(mark){
        //<span class="stree-ctxmenu-line">&nbsp;</span>
        var lineElem = document.createElement('span');
        lineElem.classList.add('stree-ctxmenu-line');
        if(mark)
            lineElem.classList.add('mark');
        lineElem.innerHTML = '&nbsp;'; 

        this.menuEl.appendChild(lineElem);
    }

    this.addItem = function(item){
        (item.line)? this.addLineItem() : this.addMenuItem(item);
    }

    this.createMenu = function(){
        //<div id="[ID]" class="stree-ctxmenu"></div>
        var menuElem = document.createElement('div');
        menuElem.setAttribute('id', this.menu.id);
        menuElem.classList.add('stree-ctxmenu');
        this.menuEl = menuElem;

        var items = this.menu.items;
        if(items && items.length > 0){
            for(var itemIdx=0;itemIdx<items.length;itemIdx++){
                this.addItem(items[itemIdx]);
            }
        }
        document.body.appendChild(menuElem);
        window.addEventListener('click', this.windowClickListener(this));
        window.addEventListener('contextmenu', this.windowClickListener(this));
    }

    this.refreshMenu = function(override, items){
        var mark = false;
        if(override){
            this.menuEl.innerHTML = "";
            mark = true;
        }else{
            var markedElems = this.menuEl.querySelectorAll('.mark');
            for(var mIdx=0;mIdx<markedElems.length;mIdx++)
                this.menuEl.removeChild(markedElems[mIdx]);
            if(items &&  items.length > 0){
                this.addLineItem(true) // add a demarcation line if there is a custom menu
                mark = true;
            }else{
                //use original menu
                this.menuEl.innerHTML = "";
                items = this.menu.items;
                mark = false;
            }
        }
        
        if(items && items.length > 0){
            for(var itemIdx=0;itemIdx<items.length;itemIdx++){
                var item = items[itemIdx];
                (item.line)? this.addLineItem(mark) : this.addMenuItem(item, mark);
            }
        }
    }
    
    this.initMenu = function(){
        if(!this.menu || !this.menu.id){
            console.log('Invalid menu structure');
            return;
        }
        this.createMenu();
    }
    this.initMenu();
}
