const ModalManager = (() => {
    const modals = new Map();

    const registerModal = (key, selector) => {
        const $modal = $(selector);
        if ($modal.length) {
            modals.set(key, $modal);
        }
    };

    const getModal = (key) => modals.get(key) || null;

    const show = (key, onShow = () => {}) => {
        const modal = getModal(key);
        if (modal) {
            modal.modal("show");
            onShow(modal);
        }
    };

    const hide = (key, onHide = () => {}) => {
        const modal = getModal(key);
        if (modal) {
            modal.modal("hide");
            onHide(modal);
        }
    };

    const toggle = (hideKey, showKey, onToggle = () => {}) => {
        const hideModal = getModal(hideKey);
        const showModal = getModal(showKey);

        if (hideModal && showModal) {
            hideModal.modal("hide");
            showModal.modal("show");
            onToggle(hideModal, showModal);
        }
    };

    return { registerModal, show, hide, toggle };
})();


ModalManager.registerModal("walletTopUp", "#paymentModal");
ModalManager.registerModal("pgGateway", "#openPGModal");

$("#walletPgTopUp").on("click", () => {
    ModalManager.show("walletTopUp");
});

$("#openPGModalBtn").on("click", () => {
    ModalManager.toggle("walletTopUp", "pgGateway");
});
