// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
// delete
import "hardhat/console.sol";

contract MetaSender {

    constructor() {}

    function getTotalValue(uint256[] memory _value) private pure returns (uint256) {

        uint256 _amount;

        for (uint256 i = 0; i < _value.length; i++) {

            _amount += _value[i];

        }

        require(_amount > 0);

        return _amount;

    }

    function sendEthSameValue(address[] memory _to, uint256 _value) external payable{

        require(_to.length < 255, "Max 244 transaction by batch");

        uint256 remainingValue = msg.value;

        require( remainingValue >= _to.length * _value, "The value is less than required");

        for (uint256 i = 0; i < _to.length; i++) {

            remainingValue -= _value;

            require(payable(_to[i]).send(_value), "Transaction not sended");

        }

        if (remainingValue > 0) payable(msg.sender).transfer(remainingValue);
    }

    function sendEthDifferentValue( address[] memory _to, uint256[] memory _value) external payable {

        require( _to.length == _value.length, "Addresses and values most be iqual" );

        require( _to.length < 255, "Max 244 transaction by batch" );

        uint256 remainingValue = msg.value;

        require(remainingValue >= getTotalValue(_value),"The value is less than required" );

        for (uint256 i = 0; i < _to.length; i++) {

            remainingValue -= _value[i];

            require( payable(_to[i]).send(_value[i]), "Transaction not sended" );

        }

        if (remainingValue > 0) payable(msg.sender).transfer(remainingValue);
    }

    function sendIERC20SameValue( address _contractAddress, address[] memory _to, uint256 _value) external{

        require( _to.length < 255, "Max 244 transaction by batch" );

        IERC20 Token = IERC20(_contractAddress);

        for(uint256 i = 0; i < _to.length; i++){

            require(Token.transferFrom(msg.sender, _to[i], _value), 'Transfer failed');

        }

    }

    function sendIERC20DifferentValue( address _contractAddress, address[] memory _to, uint256[] memory _value) external{

        require( _to.length == _value.length, "Addresses and values most be iqual" );

        require( _to.length < 255, "Max 244 transaction by batch" );

        IERC20 Token = IERC20(_contractAddress);

        for(uint256 i = 0; i < _to.length; i++){

            require(Token.transferFrom(msg.sender, _to[i], _value[i]), 'Transfer failed');

        }

    }

    function sendIERC721SameValue( address _contractAddress, address[] memory _to, uint256 _value) external{

        require( _to.length < 255, "Max 244 transaction by batch" );

        IERC20 Token = IERC20(_contractAddress);

        for(uint256 i = 0; i < _to.length; i++){

            require(Token.transferFrom(msg.sender, _to[i], _value), 'Transfer failed');

        }

    }

    function sendIERC721DifferentValue( address _contractAddress, address[] memory _to, uint256[] memory _tokenId) external{

        require( _to.length == _tokenId.length, "Addresses and values most be iqual" );

        require( _to.length < 255, "Max 244 transaction by batch" );

        IERC721 Token = IERC721(_contractAddress);

        for(uint256 i = 0; i < _to.length; i++){

            Token.transferFrom(msg.sender, _to[i], _tokenId[i]);
            
        }

    }
}
