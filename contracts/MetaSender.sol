// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
// delete
import "hardhat/console.sol";

contract MetaSender is Ownable {

    mapping(address => bool) public VIP;

    uint256 public txFee = 0.01 ether;

    uint256 public vipFee = 1 ether;

    constructor() {}

    function getTotalValue(uint256[] memory _value) private pure returns (uint256) {

        uint256 _amount;

        for (uint256 i = 0; i < _value.length; i++) {

            _amount += _value[i];

        }

        require(_amount > 0);

        return _amount;

    }

    function isVIP( address _address) private view returns (bool) {

        return VIP[ _address ];

    }

    function addVIP( address _address) external payable {

        require(msg.value >= vipFee, 'Value must be equal or superior of current VIP fee');

        VIP[_address] = true;

    }

    function removeVIP( address _address) onlyOwner external payable {

        VIP[_address] = false;
        
    }

    function setTxFee( uint256 _newTxFee ) onlyOwner external  {

        txFee = _newTxFee;

    }

    function setVIPFee( uint256 _newVIPFee ) onlyOwner external  {

        vipFee = _newVIPFee;
        
    }

    function withDrawIRC20( address _address ) onlyOwner public  {

        IERC20 Token = IERC20( _address );

        uint256 balance = Token.balanceOf(address(this));

        require(balance > 0, 'Can not transfer: insuficent founds');

        Token.transfer(owner(), balance);

    } 

    function withdrawTxFee( address _address ) onlyOwner external{

        uint256 balance = address(this).balance;

        require(balance > 0, 'Can not transfer: insuficent founds');

        payable(owner()).transfer(balance);

        if ( _address != address(0) ) withDrawIRC20(_address);

    }

    function getTransactionCost( uint256 _value, uint256 _requiredValue) private view returns(uint256) {

        uint remaingValue = _value;

        if ( isVIP( msg.sender )) require( remaingValue >= _requiredValue, "The value is less than required");

        else {

            require( remaingValue >= _requiredValue + txFee, "The value is less than required");

            remaingValue -= txFee;

        }

        return remaingValue;

    }

    function sendEthSameValue(address[] memory _to, uint256 _value) external payable{

        require(_to.length < 255, "Max 244 transaction by batch");

        uint256 remainingValue = getTransactionCost( msg.value, _to.length * _value );

        for (uint256 i = 0; i < _to.length; i++) {

            remainingValue -= _value;

            require(payable(_to[i]).send(_value), "Transaction not sended");

        }

        if (remainingValue > 0) payable(msg.sender).transfer(remainingValue);

    }

    function sendEthDifferentValue( address[] memory _to, uint256[] memory _value) external payable {

        require( _to.length == _value.length, "Addresses and values most be iqual" );

        require( _to.length < 255, "Max 244 transaction by batch" );

        uint256 remainingValue = getTransactionCost( msg.value, getTotalValue( _value ) );

        for (uint256 i = 0; i < _to.length; i++) {

            remainingValue -= _value[i];

            require( payable(_to[i]).send(_value[i]), "Transaction not sended" );

        }

        if (remainingValue > 0) payable(msg.sender).transfer(remainingValue);
    }

    function sendIERC20SameValue( address _contractAddress, address[] memory _to, uint256 _value) payable external{

        require( _to.length < 255, "Max 244 transaction by batch" );

        getTransactionCost( msg.value, 0);

        IERC20 Token = IERC20(_contractAddress);

        for(uint256 i = 0; i < _to.length; i++){

            require(Token.transferFrom(msg.sender, _to[i], _value), 'Transfer failed');

        }

    }

    function sendIERC20DifferentValue( address _contractAddress, address[] memory _to, uint256[] memory _value) payable external{

        require( _to.length == _value.length, "Addresses and values most be iqual" );

        require( _to.length < 255, "Max 244 transaction by batch" );

        getTransactionCost( msg.value, 0);

        IERC20 Token = IERC20(_contractAddress);

        for(uint256 i = 0; i < _to.length; i++){

            require(Token.transferFrom(msg.sender, _to[i], _value[i]), 'Transfer failed');

        }

    }

    function sendIERC721( address _contractAddress, address[] memory _to, uint256[] memory _tokenId) payable external{

        require( _to.length == _tokenId.length, "Addresses and values most be iqual" );

        require( _to.length < 255, "Max 244 transaction by batch" );

        getTransactionCost( msg.value, 0);

        IERC721 Token = IERC721(_contractAddress);

        for(uint256 i = 0; i < _to.length; i++){

            Token.transferFrom(msg.sender, _to[i], _tokenId[i]);
            
        }

    }
}
