const submitAjax = ({
    url,
    method = "POST",
    data = {},
    btn = null,
    headers = {},
    beforeSend = () => {},
    onSuccess = () => {},
    onError = () => {},
}) => {
    const loadingText = btn?.data("loading-text") || "Please wait...";
    const normalText = btn?.data("normal-text") || "Submit";
    if (btn) btn.html(loadingText).prop("disabled", true);

    $.ajax({
        url,
        method,
        data,
        headers: {
            "X-CSRF-TOKEN": $('meta[name="csrf-token"]').attr("content"),
            ...headers,
        },
        beforeSend: () => {
            beforeSend(data);
        },
        success: (res) => {
            onSuccess(res);
        },
        error: (xhr) => {
            const msg = xhr?.responseJSON?.message || "Something went wrong.";
            console.error(`[ERROR] ${url}`, msg);
            notify(msg, "error");
            /*  onError(xhr); */
        },
        complete: () => {
            if (btn) btn.html(normalText).prop("disabled", false);
        },
    });
};

//before submit handle 
const handleBeforeSubmit = (payload) => {
    Swal.fire({
        title: "Processing",
        text: "Your request is being submitted...",
        icon: "info",
        showConfirmButton: false,
        timer: 1500,
    });
};

//Error Response handle
const handleErrorResponse = (xhr) => {
    const msg = xhr?.responseJSON?.message || "Something went wrong.";
    Swal.fire({
        title: "Error",
        text: msg,
        icon: "error",
        confirmButtonText: "Retry",
    });
};

//how to use
submitAjax({
                        url,
                        method: "GET",
                        onSuccess: handleProviders,
                        onError: handleErrorResponse
                    });



