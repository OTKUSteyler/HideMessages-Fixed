/**
 * HideMessages — Pyoncord / ShiggyCord Plugin
 * Ported from Vencord/Equicord by yash
 */

import { findByProps, findByName } from "@vendetta/metro";
import { after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { React } from "@vendetta/metro/common";
import { showToast } from "@vendetta/ui/toasts";
import { Forms } from "@vendetta/ui/components";

const { FormRow, FormSwitchRow, FormSection, FormDivider } = Forms;

// Defaults
storage.enabled ??= true;

const FluxDispatcher = findByProps("dispatch", "_currentDispatchActionType");

function hideMessage(messageId, channelId) {
    FluxDispatcher.dispatch({
        type: "MESSAGE_DELETE",
        id: messageId,
        channelId,
        mlDeleted: true,
    });
    showToast("Message hidden until restart.");
}

// The actual bottom sheet shown on long press — visible in your screenshot
const MessageContextMenu = findByName("MessageContextMenu", false)
    ?? findByProps("MessageContextMenu")?.MessageContextMenu;

let unpatch = null;

export default {
    onLoad() {
        if (!MessageContextMenu) {
            showToast("HideMessages: Could not find MessageContextMenu");
            return;
        }

        unpatch = after("default", MessageContextMenu, ([props], res) => {
            if (!storage.enabled) return res;

            const message = props?.message;
            if (!message) return res;

            // Walk the tree to find the children array of the sheet
            const children = res?.props?.children;
            if (!children) return res;

            const flatChildren = Array.isArray(children)
                ? children
                : [children];

            // Build a plain pressable row matching Discord's native style
            const { Text, Pressable, View } = require("react-native");

            const hideRow = React.createElement(
                View,
                {
                    key: "hide-message-row",
                    style: {
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderTopWidth: 0.5,
                        borderTopColor: "rgba(255,255,255,0.08)",
                    }
                },
                React.createElement(
                    Pressable,
                    {
                        style: { flex: 1, flexDirection: "row", alignItems: "center" },
                        onPress: () => {
                            hideMessage(message.id, message.channel_id);
                            // Dismiss the sheet
                            const ActionSheet = findByProps("hideActionSheet");
                            ActionSheet?.hideActionSheet?.();
                        }
                    },
                    React.createElement(
                        Text,
                        {
                            style: {
                                color: "#FFFFFF",
                                fontSize: 16,
                                marginLeft: 16,
                            }
                        },
                        "Hide Message"
                    )
                )
            );

            // Insert before "Delete Message" (last item) or just push
            if (Array.isArray(res.props.children)) {
                const deleteIndex = res.props.children.findLastIndex?.(
                    c => c?.props?.message === "Delete Message"
                        || c?.key === "delete-message"
                ) ?? -1;

                if (deleteIndex > -1) {
                    res.props.children.splice(deleteIndex, 0, hideRow);
                } else {
                    res.props.children.push(hideRow);
                }
            }

            return res;
        });
    },

    onUnload() {
        unpatch?.();
        unpatch = null;
    },

    // Pyoncord settings: must be a React component function
    settings: () => {
        const proxy = useProxy(storage);

        return React.createElement(
            FormSection,
            { title: "HideMessages" },
            React.createElement(FormSwitchRow, {
                label: "Enable Hide Message",
                subLabel: "Show 'Hide Message' in the long-press sheet.",
                value: proxy.enabled,
                onValueChange: (v) => { proxy.enabled = v; },
            })
        );
    },
};
