// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
// delete
import "hardhat/console.sol";

/// @title A title that should describe the contract/interface
/// @notice A protocol to send bulk of Transaction compatible with ERC20 and ERC721

contract MetaSender is Ownable {

    /**************************************************************/
    /******************** VIP MEMBERS and FEEs ********************/

    //// @notice VIP members ( free Transactions )
    mapping(address => bool) public VIP;

    //// @notice cost per transaction
    uint256 public txFee = 0.01 ether;

    //// @notice cost to become a VIP Member
    uint256 public vipFee = 1 ether;

    /**************************************************************/
    /*************************** EVENTS ***************************/

    /// @param  removedVIP address of the new VIP member
    event NewVIP( address removedVIP );

    /// @param  removedVIP address of a VIP user
    event RemoveVIP( address removedVIP );

    /// @param  newVIPFee value of new transaction Fee
    event SetVIPFee( uint256 newVIPFee );

    /// @param  newTxFee value of new transaction Fee
    event SetTxFee( uint256 newTxFee );

    /// @param  from address of the user
    /// @param  amount transferred amount
    event LogETHBulkTransfer( address from, uint256 amount);

    /// @param  contractAddress token contract address
    /// @param  amount transferred amount
    event LogTokenBulkTransfer( address contractAddress, uint amount);

    /// @param  contractAddress token contract address
    /// @param  amount withdraw amount
    event WithDrawIRC20( address contractAddress, uint256 amount );

    /// @param  owner owner address
    /// @param  amount withdrawn value
    event WithdrawTxFee( address owner, uint256 amount );

    constructor() {}

    /**************************************************************/
    /************************ SET AND GET *************************/

    //// @notice returns a boolean
    //// @param _address the address of the required user
    function isVIP( address _address) private view returns (bool) {

        return VIP[ _address ];

    }

    //// @notice it adds a new VIP member
    //// @param _address the address of the new VIP Member
    function addVIP( address _address) external payable {

        require(msg.value >= vipFee, "Can't change: Value must be equal or superior of current VIP fee");

        VIP[_address] = true;

        emit NewVIP( _address );

    }

    //// @notice it remove a VIP Member only owner can access
    //// @param _address address of VIP Member
    function removeVIP( address _address) onlyOwner external payable {

        require( VIP[_address], "Can't Delete: User not exist");

        VIP[_address] = false;

        emit RemoveVIP( _address );
        
    }

    //// @notice change VIP membership cost
    //// @param _newTxFee the new VIP membership cost
    function setVIPFee( uint256 _newVIPFee ) onlyOwner external  {

        vipFee = _newVIPFee;

        emit SetVIPFee( _newVIPFee );
        
    }

    //// @notice change the Transaction cost
    //// @param _newTxFee the new Transaction cost
    function setTxFee( uint256 _newTxFee ) onlyOwner external  {

        txFee = _newTxFee;

        emit SetTxFee( _newTxFee );

    }

    //// @notice returns total value of passed amount array
    //// @param _value a array with transfer amounts
    function getTotalValue(uint256[] memory _value) private pure returns (uint256) {

        uint256 _amount;

        for (uint256 i = 0; i < _value.length; i++) {

            _amount += _value[i];

        }

        require(_amount > 0);

        return _amount;

    }

    //// @notice returns the required transfer Bulk cost
    //// @param _value the initial value
    //// @param _requiredValue value depending of transaction fee
    function getTransactionCost( uint256 _value, uint256 _requiredValue) private view returns(uint256) {

        uint remainingValue = _value;

        if ( isVIP( msg.sender )) require( remainingValue >= _requiredValue, "The value is less than required");

        else {

            require( remainingValue >= _requiredValue + txFee, "The value is less than required");

            remainingValue -= txFee;

        }

        return remainingValue;

    }

    /*************************************************************/
    /*************** MULTI-TRANSFER FUNCTIONS ********************/

    //// @notice ETH MULTI-TRANSFER transactions with same value
    //// @param _to array of receiver addresses
    //// @param _value amount to transfer
    function sendEthSameValue(address[] memory _to, uint256 _value) external payable{

        require(_to.length < 255, "Max 244 transaction by batch");

        uint256 totalValue = _to.length * _value;

        uint256 remainingValue = getTransactionCost( msg.value, totalValue );

        for (uint256 i = 0; i < _to.length; i++) {

            remainingValue -= _value;

            require(payable(_to[i]).send(_value), "Transaction not sended");

        }

        if (remainingValue > 0) payable(msg.sender).transfer(remainingValue);

        emit LogETHBulkTransfer( msg.sender, totalValue );

    }

    //// @notice ETH MULTI-TRANSFER transaction with different value
    //// @param _to array of receiver addresses
    //// @param _value array of amounts to transfer
    function sendEthDifferentValue( address[] memory _to, uint256[] memory _value) external payable {

        require( _to.length == _value.length, "Addresses and values most be equal" );

        require( _to.length < 255, "Max 244 transaction by batch" );

        uint256 totalValue = getTotalValue( _value );

        uint256 remainingValue = getTransactionCost( msg.value, totalValue );

        for (uint256 i = 0; i < _to.length; i++) {

            remainingValue -= _value[i];

            require( payable(_to[i]).send(_value[i]), "Transaction not sended" );

        }

        if (remainingValue > 0) payable(msg.sender).transfer(remainingValue);

        emit LogETHBulkTransfer( msg.sender, totalValue);
    }

    //// @notice MULTI-TRANSFER ERC20 Tokens with different value
    //// @param _contractAddress Token contract address
    //// @param _to array of receiver addresses
    //// @param _value amount to transfer
    function sendIERC20SameValue( address _contractAddress, address[] memory _to, uint256 _value) payable external{

        require( _to.length < 255, "Max 244 transaction by batch" );

        getTransactionCost( msg.value, 0);

        IERC20 Token = IERC20(_contractAddress);

        for(uint256 i = 0; i < _to.length; i++){

            require(Token.transferFrom(msg.sender, _to[i], _value), 'Transfer failed');

        }

        emit LogTokenBulkTransfer( _contractAddress, _to.length * _value);

    }

    //// @notice MULTI-TRANSFER ERC20 Tokens with different value
    //// @param _contractAddress Token contract address
    //// @param _to array of receiver addresses
    //// @param _value array of amounts to transfer
    function sendIERC20DifferentValue( address _contractAddress, address[] memory _to, uint256[] memory _value) payable external{

        require( _to.length == _value.length, "Addresses and values most be equal" );

        require( _to.length < 255, "Max 244 transaction by batch" );

        getTransactionCost( msg.value, 0);

        IERC20 Token = IERC20(_contractAddress);

        for(uint256 i = 0; i < _to.length; i++){

            require(Token.transferFrom(msg.sender, _to[i], _value[i]), 'Transfer failed');

        }

        emit LogTokenBulkTransfer( _contractAddress, getTotalValue(_value));

    }

    //// @notice MULTI-TRANSFER ERC721 Tokens with different value
    //// @param _contractAddress Token contract address
    //// @param _to array of receiver addresses
    //// @param _tokenId array of token Ids to transfer
    function sendIERC721( address _contractAddress, address[] memory _to, uint256[] memory _tokenId) payable external{

        require( _to.length == _tokenId.length, "Addresses and values most be equal" );

        require( _to.length < 255, "Max 244 transaction by batch" );

        getTransactionCost( msg.value, 0);

        IERC721 Token = IERC721(_contractAddress);

        for(uint256 i = 0; i < _to.length; i++){

            Token.transferFrom(msg.sender, _to[i], _tokenId[i]);
            
        }

        emit LogTokenBulkTransfer( _contractAddress, _tokenId.length );

    }

    /**************************************************************/
    /********************* WITHDRAW FUNCTIONS *********************/

    //// @notice withdraw a ERC20 tokens
    //// @param _address token contract address
    function withDrawIRC20( address _address ) onlyOwner public  {

        IERC20 Token = IERC20( _address );

        uint256 balance = Token.balanceOf(address(this));

        require(balance > 0, "Can't withDraw: insufficient founds");

        Token.transfer(owner(), balance);

        emit WithDrawIRC20( _address, balance );

    } 

    //// @notice withdraw Fees and membership
    //// @param _address token contract address
    //// @dev pass Zero Address if want to withdraw ETH
    function withdrawTxFee( address _address ) onlyOwner external{

        uint256 balance = address(this).balance;

        require(balance > 0, "Can't withDraw: insufficient founds");

        payable(owner()).transfer(balance);

        if ( _address != address(0) ) withDrawIRC20(_address);

        emit WithdrawTxFee( owner(), balance );

    }

}
