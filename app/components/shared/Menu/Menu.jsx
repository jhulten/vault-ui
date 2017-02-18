import React, { PropTypes } from 'react';
import _ from 'lodash';
import styles from './menu.css';
import Drawer from 'material-ui/Drawer';
import { browserHistory } from 'react-router';
import { List, ListItem, makeSelectable } from 'material-ui/List';
import { tokenHasCapabilities, callVaultApi } from '../VaultUtils.jsx'

const SelectableList = makeSelectable(List);

const supported_secret_backend_types = [
    'generic'
]

const supported_auth_backend_types = [
    'token',
    'github',
    'aws-ec2'
]

function snackBarMessage(message) {
    let ev = new CustomEvent("snackbar", { detail: { message: message } });
    document.dispatchEvent(ev);
}

class Menu extends React.Component {
    static propTypes = {
        pathname: PropTypes.string.isRequired,
    }

    constructor(props) {
        super(props);

        this.state = {
            selectedPath: this.props.pathname,
            authBackends: [],
            secretBackends: []
        };
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.pathname != nextProps.pathname) {
            this.setState({ selectedPath: nextProps.pathname });
        }
    }


    componentDidMount() {
        tokenHasCapabilities(['read'], 'sys/mounts')
            .then(() => {
                return callVaultApi('get', 'sys/mounts').then((resp) => {
                    let entries = _.get(resp, 'data.data', _.get(resp, 'data', {}));
                    let discoveredSecretBackends = _.map(entries, (v, k) => {
                        if (_.indexOf(supported_secret_backend_types, v.type) != -1) {
                            let entry = {
                                path: k,
                                type: v.type,
                                description: v.description
                            }
                            return entry;
                        }
                    }).filter(Boolean);
                    this.setState({ secretBackends: discoveredSecretBackends });
                });
            })
            .catch(() => { snackBarMessage(new Error("No permissions to list secret backends")) })


        tokenHasCapabilities(['read'], 'sys/auth')
            .then(() => {
                return callVaultApi('get', 'sys/auth').then((resp) => {
                    let entries = _.get(resp, 'data.data', _.get(resp, 'data', {}));
                    let discoveredAuthBackends = _.map(entries, (v, k) => {
                        if (_.indexOf(supported_auth_backend_types, v.type) != -1) {
                            let entry = {
                                path: k,
                                type: v.type,
                                description: v.description
                            }
                            return entry;
                        }
                    }).filter(Boolean);
                    this.setState({ authBackends: discoveredAuthBackends });
                });
            }).catch(() => { snackBarMessage(new Error("No permissions to list auth backends")) })
    }

    render() {
        let renderSecretBackendList = () => {
            return _.map(this.state.secretBackends, (backend, idx) => {
                return (
                    <ListItem key={idx} primaryText={backend.path} secondaryText={`type: ${backend.type}`} value={`/secrets/${backend.type}/${backend.path}`} />
                )
            })
        }

        let renderAuthBackendList = () => {
            return _.map(this.state.authBackends, (backend, idx) => {
                return (
                    <ListItem key={idx} primaryText={backend.path} secondaryText={`type: ${backend.type}`} value={`/auth/${backend.type}/${backend.path}`} />
                )
            })
        }

        let handleMenuChange = (e, v) => {
            this.setState({ selectedPath: v });
            browserHistory.push(v)
        }

        return (
            <Drawer containerClassName={styles.root} docked={true} open={true} >
                <SelectableList value={this.state.selectedPath} onChange={handleMenuChange}>
                    <ListItem
                        primaryText="Secret Backends"
                        primaryTogglesNestedList={true}
                        initiallyOpen={true}
                        nestedItems={renderSecretBackendList()}
                    />
                    <ListItem
                        primaryText="Auth Backends"
                        primaryTogglesNestedList={true}
                        initiallyOpen={true}
                        nestedItems={renderAuthBackendList()}
                    />
                    <ListItem
                        primaryText="System"
                        primaryTogglesNestedList={true}
                        initiallyOpen={true}
                        nestedItems={[
                            <ListItem primaryText="Policies" secondaryText="Manage Vault Access Policies" value="/sys/policies" />,
                            <ListItem primaryText="Data Wrapper" secondaryText="Securely Forward JSON Data" value="/responsewrapper" />
                        ]}
                    />
                    <ListItem
                        primaryText="Preferencies"
                        secondaryText="Customise Vault-UI"
                        primaryTogglesNestedList={false}
                        value="/settings"
                    />

                </SelectableList>
            </Drawer>
        )
    }
}

export default Menu;
