define({
    root: {
        title: "Locks",
        unavailableLocksHeader: "Cannot acquire lock.  The following lock is already acquired either by another user or in a different version:",
        andMore: "... and more.",
        andHowManyMore: "... and ${0} more.",
        routeLock: "<b>${0}</b> locked route <b>${1}</b> on network layer <b>${2}</b> in version <b>${3}</b> on <b>${4}</b>.",
        eventLock: "The <b>${1}</b> is either locked by another user or locked in a different version.<br/>Version <b>${4}</b> by <b>${0}</b> on <b>${5}</b>.",
        routeLockText: "${0} locked route ${1} on network layer ${2} in version ${3} on ${4}.",
        eventLockText: "The ${1} is either locked by another user or locked in a different version.<br/> Version ${4} by ${0} on ${5}.",
        unavailableLocksMessageForEvent: "In order to edit the <b>${0}</b> records for route <b>${1}</b> in version <b>${2}</b>, you must lock it for the route in the version you are editing.",
        requireReconcileForEvent: "A reconcile with version <b>${0}</b> is required before acquiring a lock for the <b>${1}</b> on route <b>${2}</b>.  Please reconcile and try again.",
        requireReconcileTransfer: "A reconcile with version <b>${0}</b> is required before transfering locks. Please reconcile and try again.",
        noEventLayerName: "events",
        acquireLockYesOrNoSaveChanges: "Unable to save changes.  You may not save the edit without first locking event <b>${0}</b> for route <b>${1}</b>.  Would you like to acquire a lock for this event?",
        acquireLockYesOrNoSaveChangesManyRoutes: "Unable to save changes.  You may not save the edits without first locking them.  Would you like to acquire a lock for these events?",
        acquireLockYesOrNoForEvent: "You may not edit <b>${0}</b> on route <b>${1}</b> without first locking it.  Would you like to acquire a lock for <b>${0}</b>?",
        eventEditingUnavailableLocksMessage: "You will not be able to edit the event for route <b>${0}</b> until lock is acquired in version <b>${1}</b>.",
        eventEditingUnavailableLocksMessageManyRoutes: "You will not be able to edit the events for the routes until locks are acquired in version <b>${0}</b>.",
        eventEditingRequireReconcile: "In order to continue, a lock is required.  In order to acquire a lock, you must first reconcile with the <b>${0}</b> version.  Please reconcile and try again.",
        eventEditingRequireReconcileManyRoutes: "In order to continue, locks are required.  In order to acquire locks, you must first reconcile with the <b>${0}</b> version.  Please reconcile and try again.",
        eventEditingAcquireLockYesOrNo: "In order to continue, a lock is required.  Would you like to acquire an event lock for layer <b>${0}</b> for route ID <b>${1}</b>?",
        eventEditingAcquireLockYesOrNoManyRoutes: "In order to continue, locks are required.  Would you like to acquire event locks for layer <b>${0}</b> for the following route IDs?",
        eventEditingUnableToAcquireLocks: "Unable to acquire locks for event editing.",
        unableToAcquireAllLocks: "Unable to acquire all locks.  Another user acquired one or more of the requested locks.",
        unableToAcquireLocksNoMatchingRoutes: "Unable to acquire locks.  There are no matching routes in the target network.",
        unableToReleaseLocks: "Unable to release locks.",
        unableToReleaseLocksRequireReconcile: "A reconcile is required before releasing locks.",
        unableToReleaseAllLocks: "One or more locks could not be released because they are either held by another user or have edits that have not been posted to the ${0} version.",
        unableToCheckReconcile: "Unable to check whether reconcile is needed.",
        unableToQueryLocks: "Unable to query locks.",
        unableToAcquireLocks: "Unable to acquire locks.",
        unableToTransferLocks: "Unable to transfer locks.",
        unableToTransferAllLocks: "Unable to transfer all of the locks.",
        activeEditSession: "Unable to transfer locks. There is an open edit session in the version.",
        unableToTranslateRoutes: "Unable to translate routes.",
        undefinedLockRootVersion: "The lock root version is undefined.",
        hideLockPromptLabel: "Do not prompt me again to acquire locks, always automatically acquire locks for me.<br />Note: This option can be changed in the locks table at a later time.",
        transferLocksDisabled: "The ability to transfer locks has been disabled on the LRS."
    }
});