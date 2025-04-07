const tabManagementChannel = new BroadcastChannel('tabManagementChannel'),
      tabId = Date.now();

window.onload = function() {
    tabManagementChannel.postMessage({ type: 'WordChainTabOpened', tabId: tabId });
};

tabManagementChannel.onmessage = function(event) {
    if (event.data.type === 'WordChainTabOpened' && event.data.tabId != tabId) {
        window.location.href = 'closedTab.html';
    }
};
